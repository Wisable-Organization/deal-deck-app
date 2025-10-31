import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Deal, Contact, Activity, Document, DealBuyerMatch, BuyingParty } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Calendar,
  FileSignature,
  Plus,
  FileText,
  ArrowUpRight,
  Mail,
  Phone,
  CheckCircle2,
  Circle,
  FileIcon,
  X,
  User,
  Building2,
  DollarSign,
  Target,
  ChevronDown,
  Wrench,
  Share2,
  FolderPlus,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import MatchStagePill from "@/components/match/MatchStagePill";
import BuyerChecklist from "@/components/match/BuyerChecklist";
import StageChecklistDeal from "@/components/stage/StageChecklistDeal";

const stageLabels: Record<string, string> = {
  onboarding: "Onboarding",
  valuation: "Valuation",
  buyer_matching: "Buyer Matching",
  due_diligence: "Due Diligence",
  sold: "Sold",
};

const stageColors: Record<string, string> = {
  onboarding: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  valuation: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  buyer_matching: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  due_diligence: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  sold: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};

type BuyerMatchRow = { match: DealBuyerMatch & { stage?: string | null }; party: BuyingParty; contact: Contact };

// naive finder for "pinned" docs by name; adjust when you add a proper type/tag
const findDocByName = (docs: Document[], substr: string) =>
  docs.find((d) => d?.name?.toLowerCase().includes(substr));

export default function DealDetails() {
  const { id: dealId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"buyers" | "checklist">("buyers");
  const [activeFilter, setActiveFilter] = useState("all");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string>("");

  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDocType, setShareDocType] = useState<string>("");

  const { data: deal } = useQuery<Deal>({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId,
  });

  useEffect(() => {
    setNotesDraft(deal?.notes ?? "");
  }, [deal?.notes]);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts", { entityId: dealId, entityType: "deal" }],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?entityId=${dealId}&entityType=deal`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    enabled: !!dealId,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { entityId: dealId }],
    queryFn: async () => {
      const res = await fetch(`/api/activities?entityId=${dealId}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    },
    enabled: !!dealId,
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents", { entityId: dealId }],
    queryFn: async () => {
      const res = await fetch(`/api/documents?entityId=${dealId}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
    enabled: !!dealId,
  });

  const { data: buyerMatches = [] } = useQuery<BuyerMatchRow[]>({
    queryKey: ["/api/deals", dealId, "buyers"],
    enabled: !!dealId,
  });

  const { data: buyersWithNda = [] } = useQuery<BuyingParty[]>({
    queryKey: ["/api/deals", dealId, "buyers-with-nda"],
    enabled: shareDialogOpen && !!dealId,
  });

  const { data: latestSummary } = useQuery<{ summary: string; createdAt: string; source?: string } | null>({
    queryKey: ["/api/meetings/latest-summary", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/latest-summary?dealId=${dealId}`);
      if (!res.ok) return null as any;
      return res.json();
    },
    enabled: !!dealId,
  });

  // Mutations
  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/deals/${dealId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (!res.ok) throw new Error("Failed to save notes");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      qc.invalidateQueries({ queryKey: ["/api/activities", { entityId: dealId }] });
    }
  });

  const createActivityMutation = useMutation({
    mutationFn: async (payload: Partial<Activity>) => {
      const res = await fetch(`/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, dealId })
      });
      if (!res.ok) throw new Error("Failed to create activity");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/activities", { entityId: dealId }] });
    }
  });

  // pinned docs by best-effort name match
  const pinned = useMemo(() => {
    return {
      valuation_excel: findDocByName(documents, "valuation") && findDocByName(documents, ".xlsx"),
      valuation_ppt: findDocByName(documents, "valuation") && findDocByName(documents, ".ppt"),
      cim_ppt: findDocByName(documents, "cim") || findDocByName(documents, "confidential information memorandum"),
      nda_pdf: findDocByName(documents, "nda") || findDocByName(documents, "non-disclosure"),
    } as Partial<Record<"valuation_excel"|"valuation_ppt"|"cim_ppt"|"nda_pdf", Document>>;
  }, [documents]);

  // debounce notes autosave (500ms)
  useEffect(() => {
    if (notesDraft === (deal?.notes ?? "")) return;
    const t = setTimeout(() => {
      saveNotesMutation.mutate(notesDraft);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft, deal?.notes]);

  const startTemplate = async (key: string) => {
    const map: Record<string, Partial<Activity>> = {
      email: { type: "email", title: "Email drafted", status: "pending" },
      meeting: { type: "meeting", title: "Meeting scheduled", status: "pending" },
      request_docs: { type: "task", title: "Requested documents", status: "pending" },
      send_cim: { type: "document", title: "CIM sent", status: "completed" },
      send_nda: { type: "document", title: "NDA sent", status: "completed" },
      buyer_outreach: { type: "task", title: "Buyer outreach logged", status: "pending" },
      note: { type: "system", title: "Internal note added", status: "completed" },
    };
    await createActivityMutation.mutateAsync(map[key] ?? { type: "task", title: "Activity", status: "pending" });
    setShowPresetMenu(false);
  };

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const healthBorderClass =
    deal.healthScore >= 70
      ? "border-l-green-500"
      : deal.healthScore >= 40
      ? "border-l-amber-500"
      : "border-l-rose-500";

  const filteredActivities = activities.filter((a) => (activeFilter === "all" ? true : a.type === activeFilter));
  const sellerContacts = contacts.filter((c) => c.entityType === "deal" && c.entityId === dealId);
  const recentDocs = documents.slice(0, 3);

  const stageLabel = stageLabels[deal.stage] ?? deal.stage;
  const stageColor = stageColors[deal.stage] ?? "bg-muted text-muted-foreground border-muted";

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
          <div className="py-4 space-y-3">
            {/* Breadcrumb and Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="button-back">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to Pipeline
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <h1 className="text-xl font-semibold" data-testid="text-deal-title">{deal.companyName}</h1>
                <span className="text-sm text-muted-foreground" data-testid="text-owner">{deal.owner}</span>
              </div>

              {/* Tools dropdown */}
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowToolsMenu(v => !v)}>
                  <Wrench className="w-4 h-4 mr-2" /> Tools <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
                {showToolsMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow z-50">
                    <a className="block px-3 py-2 text-sm hover:bg-muted" href={`/open/tool/minival?dealId=${deal.id}`} target="_blank" rel="noreferrer">MiniVal</a>
                    <a className="block px-3 py-2 text-sm hover:bg-muted" href={`/open/tool/cim?dealId=${deal.id}`} target="_blank" rel="noreferrer">CIM Tool</a>
                    <a className="block px-3 py-2 text-sm hover:bg-muted" href={`/open/tool/deck?dealId=${deal.id}`} target="_blank" rel="noreferrer">Deck Tool</a>
                    <a className="block px-3 py-2 text-sm hover:bg-muted" href={`/open/tool/narrative?dealId=${deal.id}`} target="_blank" rel="noreferrer">Narrative</a>
                  </div>
                )}
              </div>
            </div>

            {/* Command Bar */}
            <div className="flex">
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" data-testid="button-schedule">
                  <Calendar className="w-4 h-4 mr-2" /> Schedule
                </Button>
                <Button variant="outline" size="sm" data-testid="button-signature">
                  <FileSignature className="w-4 h-4 mr-2" /> Send for Signature
                </Button>
                <Button variant="outline" size="sm" data-testid="button-add-doc">
                  <Plus className="w-4 h-4 mr-2" /> Add Doc
                </Button>
                <Button variant="outline" size="sm" data-testid="button-create-invoice">
                  <FileText className="w-4 h-4 mr-2" /> Create Invoice
                </Button>
                <Button variant="outline" size="sm" data-testid="button-update-stage">
                  <ArrowUpRight className="w-4 h-4 mr-2" /> Update Stage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDrawerMode("checklist"); setShowDrawer(true); }}
                  data-testid="button-stage-checklist"
                >
                  Stage Checklist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDrawerMode("buyers"); setShowDrawer(true); }}
                  data-testid="button-buying-parties"
                >
                  Buying Parties
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Left Column - Deal Overview */}
          <div className="w-[360px] shrink-0 space-y-4">
            {/* Stage Badge */}
            <Badge className={cn("text-sm px-4 py-1.5 w-fit", stageColor)} data-testid="badge-stage">{stageLabel}</Badge>
            
            <Card className={cn("p-6 space-y-4 bg-white dark:bg-neutral-900 border border-border","border-l-[6px]",healthBorderClass)}>
              <h2 className="text-lg font-semibold">Deal Snapshot</h2>

              {/* Transcript summary (if present) */}
              {latestSummary?.summary && (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Latest Meeting Summary {latestSummary.createdAt ? `• ${new Date(latestSummary.createdAt).toLocaleDateString()}` : ""}
                  </div>
                  <div className="text-sm text-foreground">
                    {latestSummary.summary}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                  <div className="text-base font-mono font-semibold" data-testid="text-revenue">
                    ${parseFloat(deal.revenue).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">SDE</div>
                  <div className="text-base font-mono font-semibold" data-testid="text-sde">
                    ${deal.sde ? parseFloat(deal.sde).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Valuation</div>
                  <div className="text-base font-semibold" data-testid="text-valuation">
                    ${deal.valuationMin ? parseFloat(deal.valuationMin).toLocaleString() : 'N/A'} - ${deal.valuationMax ? parseFloat(deal.valuationMax).toLocaleString() : 'N/A'}
                  </div>
                </div>

                {/* Multiples (grouped) */}
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">Multiples</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700">
                      SDE&nbsp;{(deal as any).sdeMultiple ?? "—"}x
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700">
                      Revenue&nbsp;{(deal as any).revenueMultiple ?? "—"}x
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Commission</div>
                  <div className="text-base font-semibold" data-testid="text-commission">
                    {deal.commission}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Age in Stage</div>
                  <div className="text-base font-semibold" data-testid="text-age">
                    {deal.ageInStage} days
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Health Score</div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold" data-testid="text-health">{deal.healthScore}%</div>
                    <Progress value={deal.healthScore} className="h-1.5" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Description */}
            {deal.description && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
              </Card>
            )}

            {/* Notes (editable with autosave) */}
            <Card className="p-4">
              <button
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="w-full flex items-center justify-between text-sm font-semibold mb-2"
                data-testid="button-toggle-notes"
              >
                <span>Notes</span>
                <span className="text-xs text-muted-foreground">
                  {notesExpanded ? "Collapse" : "Expand"}
                </span>
              </button>
              {notesExpanded && (
                <textarea
                  className="w-full min-h-[120px] text-sm border border-input rounded-md bg-background p-2 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add internal notes…"
                  data-testid="textarea-notes"
                />
              )}
              {saveNotesMutation.isPending && (
                <div className="mt-1 text-[11px] text-muted-foreground">Saving…</div>
              )}
              {saveNotesMutation.isSuccess && (
                <div className="mt-1 text-[11px] text-muted-foreground">Saved</div>
              )}
            </Card>

            {/* Seller Contacts */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Seller Contacts</h3>
              <div className="space-y-3">
                {sellerContacts.map((contact) => (
                  <div key={contact.id} className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{contact.name}</div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {contact.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-email-${contact.id}`}>
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-call-${contact.id}`}>
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pinned + Recent Documents */}
            <Card className="p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold">Key Documents</h3>
                <div className="mt-2 grid grid-cols-1 gap-3">
                  {([
                    { key: "valuation_excel", label: "Valuation (Excel)", type: "valuation_excel" },
                    { key: "valuation_ppt", label: "Valuation (PPT)", type: "valuation_ppt" },
                    { key: "cim_ppt", label: "CIM (PPT)", type: "cim_ppt" },
                    { key: "nda_pdf", label: "NDA (PDF)", type: "nda_pdf" },
                  ] as const).map(({ key, label, type }) => {
                    const doc = (pinned as any)[key] as Document | undefined;
                    const isCim = type === "cim_ppt";
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!doc && (
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled
                              data-testid={`button-create-${type}`}
                            >
                              <FolderPlus className="w-4 h-4" />
                            </Button>
                          )}
                          {doc && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(`/open/doc/${doc.id}`, '_blank')}
                              data-testid={`button-open-${type}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          {doc && isCim && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setShareDocType(type);
                                setShareDialogOpen(true);
                              }}
                              data-testid={`button-share-${type}`}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</h4>
                <a href="#" className="text-xs text-primary hover:underline" data-testid="link-view-all-docs">
                  View all
                </a>
              </div>
              <div className="space-y-2">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{doc.name}</span>
                    </div>
                    <Badge variant={doc.status === "signed" ? "default" : "secondary"} className="text-xs">
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Middle Column - Activity Timeline */}
          <div className="flex-1 space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Activity Timeline</h2>
                <div className="flex items-center gap-2">
                  {["all", "task", "email", "meeting", "document", "system"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                        activeFilter === filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover-elevate"
                      )}
                      data-testid={`button-filter-${filter}`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filteredActivities.map((activity, index) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          activity.status === "completed" ? "bg-chart-2/10 text-chart-2" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {activity.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </div>
                      {index < filteredActivities.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <Badge variant={activity.status === "completed" ? "default" : "secondary"} className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                      {activity.description && <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {activity.assignedTo && <span>{activity.assignedTo}</span>}
                        {activity.createdAt && <span>{new Date(activity.createdAt).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" data-testid={`button-mark-done-${activity.id}`}>
                          Mark Done
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" data-testid={`button-comment-${activity.id}`}>
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Task — split button with preset menu */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    placeholder="Add a new task..."
                    className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="input-new-task"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value.trim()) {
                        await createActivityMutation.mutateAsync({
                          type: "task",
                          title: (e.currentTarget as HTMLInputElement).value.trim(),
                          status: "pending",
                        });
                        (e.currentTarget as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <Button size="sm" data-testid="button-add-task">
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="-ml-2"
                    onClick={() => setShowPresetMenu((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={showPresetMenu}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  {showPresetMenu && (
                    <div className="absolute right-0 top-[110%] w-56 rounded-md border bg-popover shadow z-50">
                      {[
                        { key: "email", label: "Email" },
                        { key: "meeting", label: "Schedule meeting" },
                        { key: "request_docs", label: "Request docs" },
                        { key: "send_cim", label: "Send CIM" },
                        { key: "send_nda", label: "Send NDA" },
                        { key: "buyer_outreach", label: "Buyer outreach" },
                        { key: "note", label: "Note" },
                      ].map((i) => (
                        <button
                          key={i.key}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => startTemplate(i.key)}
                        >
                          {i.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column (Drawer) */}
          {showDrawer && (
            <div className="w-[420px] shrink-0">
              <div className="h-full bg-background border-l border-border rounded-none">
                {/* Header */}
                <div className="sticky top-[4rem] z-10 bg-background border-b border-border p-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {drawerMode === "buyers" ? "Buyer Matches" : "Stage Checklist"}
                  </h2>
                  <Button size="icon" variant="ghost" onClick={() => setShowDrawer(false)} data-testid="button-close-drawer">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 overflow-y-auto">
                  {drawerMode === "buyers" && buyerMatches.map(({ match, party, contact }) => (
                    <Card
                      key={match.id}
                      className="p-4 space-y-3 hover-elevate"
                      data-testid={`card-buyer-${party.id}`}
                    >
                      <div className="flex items-start justify-between">
                        {/* Only this header button navigates to Buying Party details */}
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left hover:opacity-90 focus:outline-none"
                          onClick={() => navigate(`/buying-parties/${party.id}`)}
                          data-testid={`link-buyer-${party.id}`}
                        >
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                          <span className="font-semibold">{party.name}</span>
                        </button>
                        <MatchStagePill matchId={match.id} stage={(match as any).stage ?? (match as any).status} />
                      </div>

                      <div className="space-y-2">
                        {contact && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{contact.name}</span>
                            {contact.role && <span className="text-xs text-muted-foreground">• {contact.role}</span>}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Target: {(match as any).targetAcquisition || party.targetAcquisitionMin}-{party.targetAcquisitionMax}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground font-mono">
                            ${(match as any).budget ? parseFloat((match as any).budget).toLocaleString() : 'Budget TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Expandable per-buyer checklist (now fully clickable) */}
                      <details className="mt-2 group" data-testid={`details-checklist-${match.id}`}>
                        <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                          Checklist
                        </summary>
                        <div className="mt-2">
                          <BuyerChecklist matchId={match.id} />
                        </div>
                      </details>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={(e)=>{e.stopPropagation();}} data-testid={`button-email-buyer-${party.id}`}>
                          <Mail className="w-4 h-4 mr-1" /> Email
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={(e)=>{e.stopPropagation();}} data-testid={`button-schedule-buyer-${party.id}`}>
                          <Calendar className="w-4 h-4 mr-1" /> Schedule
                        </Button>
                      </div>
                    </Card>
                  ))}

                  {/* Deal-level Stage Checklist */}
                  {drawerMode === "checklist" && (
                    <Card className="p-4">
                      <StageChecklistDeal dealId={deal.id} stageLabel={stageLabel} />
                    </Card>
                  )}

                  {buyerMatches.length === 0 && drawerMode === "buyers" && (
                    <div className="text-center text-sm text-muted-foreground py-8">No buyer matches yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Share Document Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Share this document with buyers who have signed NDAs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {buyersWithNda.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No buyers have signed NDAs yet
              </div>
            ) : (
              <div className="space-y-2">
                {buyersWithNda.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{buyer.name}</div>
                        <div className="text-xs text-muted-foreground">NDA Signed</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Document shared",
                          description: `CIM shared with ${buyer.name}`,
                        });
                        setShareDialogOpen(false);
                      }}
                      data-testid={`button-share-with-${buyer.id}`}
                    >
                      Share
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}










