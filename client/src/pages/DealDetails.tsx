import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Deal, Contact, Activity, Document, DealBuyerMatch, BuyingParty, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  User as UserIcon,
  Building2,
  DollarSign,
  Target,
  ChevronDown,
  Wrench,
  Share2,
  FolderPlus,
  ExternalLink,
  Edit,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import MatchStagePill from "@/components/match/MatchStagePill";
import BuyerChecklist from "@/components/match/BuyerChecklist";
import StageChecklistDeal from "@/components/stage/StageChecklistDeal";
import { LoadingState } from "@/components/LoadingState";

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

  const [addActivityDialogOpen, setAddActivityDialogOpen] = useState(false);
  const [newActivityData, setNewActivityData] = useState({
    title: "",
    type: "note",
    description: "",
    dueDate: "",
    assignedTo: "",
  });

  const [addBuyerDialogOpen, setAddBuyerDialogOpen] = useState(false);
  const [addingBuyerId, setAddingBuyerId] = useState<string | null>(null);
  const [deleteMatchDialogOpen, setDeleteMatchDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<{ id: string; partyName: string } | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Deal>>({});

  // Declare deleteDealMutation early so we can use it in query enabled conditions
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper function to extract error message from API response
  const getErrorMessage = (error: any, fallback: string = "An error occurred") => {
    if (error?.data?.detail) {
      if (typeof error.data.detail === 'object') {
        return Object.values(error.data.detail).flat().join(', ');
      }
      return error.data.detail;
    }
    return error instanceof Error ? error.message : fallback;
  };

  const { data: deal } = useQuery<Deal>({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId && !isDeleting,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (deal was deleted)
      if (error?.message?.includes('404') || error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  useEffect(() => {
    setNotesDraft(deal?.notes ?? "");
  }, [deal?.notes]);

  // Initialize edit form data when dialog opens
  useEffect(() => {
    if (editDialogOpen && deal) {
      setEditFormData({
        companyName: deal.companyName,
        description: deal.description,
        revenue: deal.revenue,
        sde: deal.sde,
        valuationMin: deal.valuationMin,
        valuationMax: deal.valuationMax,
        stage: deal.stage,
        healthScore: deal.healthScore,
        ownerId: deal.ownerId,
      });
    }
  }, [editDialogOpen, deal]);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts", { entityId: dealId, entityType: "deal" }],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?entityId=${dealId}&entityType=deal`);
      if (!res.ok) throw res;
      return res.json();
    },
    enabled: !!dealId && !isDeleting,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { entityId: dealId }],
    queryFn: async () => {
      const res = await fetch(`/api/activities?entityId=${dealId}`);
      if (!res.ok) throw res;
      return res.json();
    },
    enabled: !!dealId && !isDeleting,
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents", { entityId: dealId }],
    queryFn: async () => {
      const res = await fetch(`/api/documents?entityId=${dealId}`);
      if (!res.ok) throw res;
      return res.json();
    },
    enabled: !!dealId && !isDeleting,
  });

  const { data: buyerMatches = [], isLoading: isLoadingBuyerMatches } = useQuery<BuyerMatchRow[]>({
    queryKey: ["/api/deals", dealId, "buyers"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/buyers`);
      if (!res.ok) throw res;
      return res.json();
    },
    enabled: !!dealId && !isDeleting,
  });

  const { data: allBuyingParties = [] } = useQuery<BuyingParty[]>({
    queryKey: ["/api/buying-parties"],
    queryFn: async () => {
      const res = await fetch("/api/buying-parties");
      if (!res.ok) throw res;
      return res.json();
    },
    enabled: !!dealId && !isDeleting,
  });

  const { data: buyersWithNda = [] } = useQuery<BuyingParty[]>({
    queryKey: ["/api/deals", dealId, "buyers-with-nda"],
    enabled: shareDialogOpen && !!dealId && !isDeleting,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: latestSummary } = useQuery<{ summary: string; createdAt: string; source?: string } | null>({
    queryKey: ["/api/meetings/latest-summary", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/latest-summary?dealId=${dealId}`);
      if (!res.ok) return null as any;
      return res.json();
    },
    enabled: !!dealId && !isDeleting,
  });

  // Mutations
  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/deals/${dealId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (!res.ok) throw res;
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
        body: JSON.stringify({ ...payload, dealId: dealId })
      });
      if (!res.ok) throw res;
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/activities", { entityId: dealId }] });
      toast({
        title: "Activity added",
        description: "The activity has been added to the timeline",
      });
      setAddActivityDialogOpen(false);
      setNewActivityData({
        title: "",
        type: "note",
        description: "",
        dueDate: "",
        assignedTo: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create activity"),
        variant: "destructive",
      });
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityId, payload }: { activityId: string; payload: Partial<Activity> }) => {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw res;
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/activities", { entityId: dealId }] });
      toast({
        title: "Activity updated",
        description: "The activity status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update activity"),
        variant: "destructive",
      });
    }
  });

  const updateDealMutation = useMutation({
    mutationFn: async (payload: Partial<Deal>) => {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error: any = new Error(`HTTP ${res.status}: ${res.statusText}`);
        error.response = res;
        error.status = res.status;
        error.statusText = res.statusText;
        try {
          error.data = await res.json();
        } catch {
          error.data = await res.text();
        }
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      qc.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: "Deal updated",
        description: "The deal has been updated successfully",
      });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update deal"),
        variant: "destructive",
      });
    }
  });

  const deleteDealMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error: any = new Error(`HTTP ${res.status}: ${res.statusText}`);
        error.response = res;
        error.status = res.status;
        error.statusText = res.statusText;
        try {
          error.data = await res.json();
        } catch {
          error.data = await res.text();
        }
        throw error;
      }
      // Check if response has content before parsing JSON
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    },
    onSuccess: () => {
      // Invalidate all deals queries to refresh the dashboard
      qc.invalidateQueries({ queryKey: ["/api/deals"] });
      // Navigate immediately before showing toast to avoid 404 errors from queries
      navigate("/", { replace: true });
      // Show toast after navigation
      setTimeout(() => {
        toast({
          title: "Deal deleted",
          description: "The deal has been deleted successfully",
        });
      }, 100);
    },
    onError: (error: any) => {
      setIsDeleting(false);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete deal"),
        variant: "destructive",
      });
    }
  });

  const createBuyerMatchMutation = useMutation({
    mutationFn: async (buyingPartyId: string) => {
      setAddingBuyerId(buyingPartyId);
      const res = await fetch("/api/deal-buyer-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: dealId,
          buyingPartyId: buyingPartyId,
          status: "interested",
          stage: "new"
        })
      });
      if (!res.ok) throw res;
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/deals", dealId, "buyers"] });
      toast({
        title: "Buyer match created",
        description: "The buyer has been matched to this deal",
      });
      setAddBuyerDialogOpen(false);
      setAddingBuyerId(null);
    },
    onError: (error: any) => {
      setAddingBuyerId(null);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create buyer match"),
        variant: "destructive",
      });
    }
  });

  const deleteBuyerMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(`/api/deal-buyer-matches/${matchId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw res;
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/deals", dealId, "buyers"] });
      toast({
        title: "Buyer unmatched",
        description: "The buyer has been removed from this deal",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to unmatch buyer"),
        variant: "destructive",
      });
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

  // Filter out buying parties that are already matched to this deal
  const availableBuyingParties = useMemo(() => {
    const matchedPartyIds = new Set(buyerMatches.map(match => match.party.id));
    return allBuyingParties.filter(party => !matchedPartyIds.has(party.id));
  }, [buyerMatches, allBuyingParties]);

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
  const sellerContacts = contacts; // Already filtered by entityId and entityType in the query
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

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} data-testid="button-delete-deal">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
                
                {/* Tools dropdown */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowToolsMenu(v => !v)}>
                    <Wrench className="w-4 h-4 mr-2" /> Tools <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                  {showToolsMenu && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow z-50">
                      <a className="block px-3 py-2 text-sm hover:bg-muted" href={`https://wisable1.retool.com/apps/e5ad1f14-7c61-11f0-80f8-e39357046c2e/Mini%20Val/page1`} target="_blank" rel="noreferrer">MiniVal</a>
                      <a className="block px-3 py-2 text-sm hover:bg-muted" href={`https://wisable1.retool.com/apps/efbfb65a-6d76-11f0-89ab-8bcb24aa30f5/CIM%20Tool/page1`} target="_blank" rel="noreferrer">CIM Tool</a>
                      <a className="block px-3 py-2 text-sm hover:bg-muted" href={`https://wisable1.retool.com/apps/61bff2b0-8ce9-11f0-be22-674731c2d7bd/Deck%20Tool/page1`} target="_blank" rel="noreferrer">Deck Tool</a>
                      <a className="block px-3 py-2 text-sm hover:bg-muted" href={`https://wisable1.retool.com/apps/10da5c46-6d77-11f0-b7c1-53aa20010f23/Narrative%20Tool/page1`} target="_blank" rel="noreferrer">Narrative</a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Command Bar */}
            <div className="flex">
              <div className="ml-auto flex items-center gap-2">
                {/* <Button variant="outline" size="sm" data-testid="button-schedule">
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
                </Button> */}
{/*                 <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDrawerMode("checklist"); setShowDrawer(true); }}
                  data-testid="button-stage-checklist"
                >
                  Stage Checklist
                </Button> */}
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
        <div className={`grid gap-6 ${showDrawer ? 'lg:grid-cols-[360px_1fr_420px] grid-cols-1' : 'grid-cols-[360px_1fr]'}`}>
          {/* Left Column - Deal Overview */}
          <div className={`w-[360px] space-y-4 ${showDrawer ? 'lg:block hidden' : ''}`}>
            {/* Stage Badge and Edit Button Row */}
            <div className="flex items-center justify-between">
              <Badge className={cn("text-sm px-4 py-1.5 w-fit", stageColor)} data-testid="badge-stage">{stageLabel}</Badge>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)} data-testid="button-edit-deal">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </div>

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
{/*                 <div>
                  <div className="text-xs text-muted-foreground mb-1">SDE</div>
                  <div className="text-base font-mono font-semibold" data-testid="text-sde">
                    ${deal.sde ? parseFloat(deal.sde).toLocaleString() : 'N/A'}
                  </div>
                </div> */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Valuation</div>
                  <div className="text-base font-semibold" data-testid="text-valuation">
                    ${deal.valuationMin ? parseFloat(deal.valuationMin).toLocaleString() : 'N/A'} - ${deal.valuationMax ? parseFloat(deal.valuationMax).toLocaleString() : 'N/A'}
                  </div>
                </div>

                {/* Multiples (grouped) */}
{/*                 <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">Multiples</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700">
                      SDE&nbsp;{(deal as any).sdeMultiple ?? "—"}x
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700">
                      Revenue&nbsp;{(deal as any).revenueMultiple ?? "—"}x
                    </span>
                  </div>
                </div> */}

                {/*<div>
                  <div className="text-xs text-muted-foreground mb-1">Commission</div>
                  <div className="text-base font-semibold" data-testid="text-commission">
                    {deal.commission}%
                  </div>
                </div> */}
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
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Activity Timeline</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {["all", "task", "note", "email", "meeting", "document", "system"].map((filter) => (
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
                  <Button 
                    size="sm" 
                    onClick={() => setAddActivityDialogOpen(true)}
                    data-testid="button-add-activity"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Activity
                  </Button>
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
                      {activity.description && (
                        <div 
                          className="text-sm text-muted-foreground mb-2" 
                          dangerouslySetInnerHTML={{ __html: activity.description }}
                        />
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {activity.assignedTo && <span>{activity.assignedTo}</span>}
                        {activity.createdAt && <span>{new Date(activity.createdAt).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => updateActivityMutation.mutate({ activityId: activity.id, payload: { status: "completed" } })}
                          disabled={activity.status === "completed" || (updateActivityMutation.isPending && updateActivityMutation.variables?.activityId === activity.id)}
                          data-testid={`button-mark-done-${activity.id}`}
                        >
                          {updateActivityMutation.isPending && updateActivityMutation.variables?.activityId === activity.id ? "Updating..." : "Mark Done"}
                        </Button>
                        {/*<Button size="sm" variant="ghost" className="h-7 text-xs" data-testid={`button-comment-${activity.id}`}>
                          Comment
                        </Button>*/}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column (Drawer) */}
          {showDrawer && (
            <div className="lg:w-[420px] w-full">
              <div className="h-full bg-background border-l border-border rounded-none">
                {/* Header */}
                <div className="bg-background border-b border-border p-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {drawerMode === "buyers" ? "Buyer Matches" : "Stage Checklist"}
                  </h2>
                  <Button size="icon" variant="ghost" onClick={() => setShowDrawer(false)} data-testid="button-close-drawer">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Add Buyer Party Button - only show for buyers mode */}
                {drawerMode === "buyers" && (
                  <div className="p-4 bg-background/95 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setAddBuyerDialogOpen(true)}
                      data-testid="button-add-buyer-party"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Buyer Party
                    </Button>
                  </div>
                )}

                {/* Body */}
                <div className="p-4 space-y-4 overflow-y-auto">
                  {drawerMode === "buyers" && (
                    <>
                      {isLoadingBuyerMatches ? (
                        <LoadingState variant="card" count={3} />
                      ) : (
                        <>
                          {buyerMatches.map(({ match, party, contact }) => (
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
                                <div className="flex items-center gap-2">
                                  <MatchStagePill matchId={match.id} stage={(match as any).stage ?? (match as any).status} />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMatchToDelete({ id: match.id, partyName: party.name });
                                      setDeleteMatchDialogOpen(true);
                                    }}
                                    data-testid={`button-unmatch-${party.id}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {contact && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <UserIcon className="w-4 h-4 text-muted-foreground" />
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
                                    ${(match as any).budget ? parseFloat((match as any).budget).toLocaleString() : 'Check Size TBD'}
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
                                <a href={`mailto:${contact?.email}`} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="outline" className="flex-1" data-testid={`button-email-buyer-${party.id}`}>
                                    <Mail className="w-4 h-4 mr-1" /> Email
                                  </Button>
                                </a>
{/*                                 <Button size="sm" variant="outline" className="flex-1" onClick={(e)=>{e.stopPropagation();}} data-testid={`button-schedule-buyer-${party.id}`}>
                                  <Calendar className="w-4 h-4 mr-1" /> Schedule
                                </Button> */}
                              </div>
                            </Card>
                          ))}
                          {buyerMatches.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">No buyer matches yet</div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Deal-level Stage Checklist */}
                  {drawerMode === "checklist" && (
                    <Card className="p-4">
                      <StageChecklistDeal dealId={deal.id} stageLabel={stageLabel} />
                    </Card>
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

      {/* Delete Match Confirmation Dialog */}
      <AlertDialog open={deleteMatchDialogOpen} onOpenChange={setDeleteMatchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmatch Buyer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unmatch {matchToDelete?.partyName} from this deal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (matchToDelete) {
                  deleteBuyerMatchMutation.mutate(matchToDelete.id);
                  setDeleteMatchDialogOpen(false);
                  setMatchToDelete(null);
                }
              }}
              disabled={deleteBuyerMatchMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBuyerMatchMutation.isPending ? "Unmatching..." : "Unmatch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Deal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>
              Update the deal information below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-companyName">Company Name</Label>
                <Input
                  id="edit-companyName"
                  value={editFormData.companyName || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ownerId">Owner</Label>
                <Select
                  value={editFormData.ownerId || ""}
                  onValueChange={(value) => setEditFormData({ ...editFormData, ownerId: value })}
                >
                  <SelectTrigger id="edit-ownerId">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description || ""}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Deal description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input
                  id="edit-revenue"
                  type="number"
                  value={editFormData.revenue || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, revenue: e.target.value })}
                  placeholder="Annual revenue"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sde">SDE</Label>
                <Input
                  id="edit-sde"
                  type="number"
                  value={editFormData.sde || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, sde: e.target.value })}
                  placeholder="Seller's discretionary earnings"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-valuationMin">Valuation Min</Label>
                <Input
                  id="edit-valuationMin"
                  type="number"
                  value={editFormData.valuationMin || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, valuationMin: e.target.value })}
                  placeholder="Minimum valuation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-valuationMax">Valuation Max</Label>
                <Input
                  id="edit-valuationMax"
                  type="number"
                  value={editFormData.valuationMax || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, valuationMax: e.target.value })}
                  placeholder="Maximum valuation"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-stage">Stage</Label>
                <Select
                  value={editFormData.stage || ""}
                  onValueChange={(value) => setEditFormData({ ...editFormData, stage: value as "onboarding" | "valuation" | "buyer_matching" | "due_diligence" | "sold" })}
                >
                  <SelectTrigger id="edit-stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="valuation">Valuation</SelectItem>
                    <SelectItem value="buyer_matching">Buyer Matching</SelectItem>
                    <SelectItem value="due_diligence">Due Diligence</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-healthScore">Health Score (%)</Label>
                <Input
                  id="edit-healthScore"
                  type="number"
                  min="0"
                  max="100"
                  value={editFormData.healthScore || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, healthScore: parseInt(e.target.value) || 0 })}
                  placeholder="0-100"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateDealMutation.mutate(editFormData)}
              disabled={updateDealMutation.isPending}
            >
              {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the deal
              "{deal?.companyName}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDealMutation.mutate()}
              disabled={deleteDealMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDealMutation.isPending ? "Deleting..." : "Delete Deal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Buyer Party Dialog */}
      <Dialog open={addBuyerDialogOpen} onOpenChange={setAddBuyerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Buyer Party</DialogTitle>
            <DialogDescription>
              Select a buyer party to match with this deal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableBuyingParties.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No available buyer parties to add
              </div>
            ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableBuyingParties.map((party) => (
                  <div
                    key={party.id}
                    className="flex items-center justify-between p-3 border rounded-md hover-elevate cursor-pointer"
                    onClick={() => {
                      if (addingBuyerId === null) {
                        createBuyerMatchMutation.mutate(party.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{party.name}</div>
                        {party.targetAcquisitionMin && party.targetAcquisitionMax && (
                          <div className="text-xs text-muted-foreground">
                            Target: {party.targetAcquisitionMin}-{party.targetAcquisitionMax}%
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={addingBuyerId !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        createBuyerMatchMutation.mutate(party.id);
                      }}
                    >
                      {addingBuyerId === party.id ? "Adding..." : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={addActivityDialogOpen} onOpenChange={setAddActivityDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Add a new activity to the timeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="activity-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="activity-title"
                value={newActivityData.title}
                onChange={(e) => setNewActivityData({ ...newActivityData, title: e.target.value })}
                placeholder="e.g., Follow up with seller"
                data-testid="input-activity-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-type">Type</Label>
              <Select
                value={newActivityData.type}
                onValueChange={(value) => setNewActivityData({ ...newActivityData, type: value })}
              >
                <SelectTrigger id="activity-type" data-testid="select-activity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                value={newActivityData.description}
                onChange={(e) => setNewActivityData({ ...newActivityData, description: e.target.value })}
                placeholder="Add additional details..."
                rows={3}
                data-testid="textarea-activity-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity-due-date">Due Date</Label>
                <Input
                  id="activity-due-date"
                  type="date"
                  value={newActivityData.dueDate}
                  onChange={(e) => setNewActivityData({ ...newActivityData, dueDate: e.target.value })}
                  data-testid="input-activity-due-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-assigned-to">Assigned To</Label>
                <Input
                  id="activity-assigned-to"
                  value={newActivityData.assignedTo}
                  onChange={(e) => setNewActivityData({ ...newActivityData, assignedTo: e.target.value })}
                  placeholder="e.g., John Doe"
                  data-testid="input-activity-assigned-to"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setAddActivityDialogOpen(false);
                setNewActivityData({
                  title: "",
                  type: "note",
                  description: "",
                  dueDate: "",
                  assignedTo: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const payload: any = {
                  title: newActivityData.title,
                  type: newActivityData.type,
                  status: "pending",
                };
                
                if (newActivityData.description) {
                  payload.description = newActivityData.description;
                }
                
                if (newActivityData.dueDate) {
                  payload.dueDate = new Date(newActivityData.dueDate).toISOString();
                }
                
                if (newActivityData.assignedTo) {
                  payload.assignedTo = newActivityData.assignedTo;
                }
                
                createActivityMutation.mutate(payload);
              }}
              disabled={!newActivityData.title || createActivityMutation.isPending}
              data-testid="button-save-activity"
            >
              {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}










