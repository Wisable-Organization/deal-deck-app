import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BuyingParty,
  Contact,
  Activity,
  Document,
  Deal,
  DealBuyerMatch,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Calendar,
  Mail,
  Phone,
  Edit,
  Plus,
  FileIcon,
  Target,
  DollarSign,
  Clock,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoadingState } from "@/components/LoadingState";

// Extended Contact type for API responses that include entity linking info
// Note: API returns snake_case (entity_id, entity_type) but we'll handle both
type ContactWithEntity = Contact & {
  entityId?: string | null;
  entityType?: string | null;
  entity_id?: string | null;
  entity_type?: string | null;
};

type PartyMatchRow = { match: DealBuyerMatch; deal: Deal };

export default function BuyingPartyDetail() {
  const { id: partyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string>("");
  const lastServerNotesRef = useRef<string>("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    targetAcquisitionMin: "",
    targetAcquisitionMax: "",
    budgetMin: "",
    budgetMax: "",
  });
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showConfirmAdd, setShowConfirmAdd] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const { data: party } = useQuery<BuyingParty>({
    queryKey: [`/api/buying-parties/${partyId}`],
    enabled: !!partyId,
  });

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<ContactWithEntity[]>({
    queryKey: ["/api/contacts", { entityId: partyId, entityType: "buying_party" }],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?entityId=${partyId}&entityType=buying_party`);
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
    enabled: !!partyId,
  });

  const { data: allContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts`);
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
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { entityId: partyId }],
    queryFn: async () => {
      const res = await fetch(`/api/activities?entityId=${partyId}`);
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
    enabled: !!partyId,
  });

  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents", { entityId: partyId }],
    queryFn: async () => {
      const res = await fetch(`/api/documents?entityId=${partyId}`);
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
    enabled: !!partyId,
  });

  // All matches (deals) for this party, including per-deal interest level
  const { data: partyMatches = [], isLoading: isLoadingMatches } = useQuery<PartyMatchRow[]>({
    queryKey: ["/api/buying-parties", partyId, "matches"],
    queryFn: async () => {
      const res = await fetch(`/api/buying-parties/${partyId}/matches`);
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
    enabled: !!partyId,
  });

  // Sync notesDraft with party.notes only when server value changes and no unsaved edits exist
  useEffect(() => {
    const serverNotes = party?.notes ?? "";
    // Only update if this is a new server value AND user has no unsaved edits
    if (serverNotes !== lastServerNotesRef.current && notesDraft === lastServerNotesRef.current) {
      lastServerNotesRef.current = serverNotes;
      setNotesDraft(serverNotes);
    } else if (serverNotes !== lastServerNotesRef.current) {
      // Server changed but user has unsaved edits - just update the ref
      lastServerNotesRef.current = serverNotes;
    }
  }, [party?.notes, notesDraft]);

  // Mutation to save notes
  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/buying-parties/${partyId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
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
    onSuccess: (_, notes) => {
      // Update ref to track what we just saved
      lastServerNotesRef.current = notes;
      qc.invalidateQueries({ queryKey: [`/api/buying-parties/${partyId}`] });
    }
  });

  // Auto-save notes with debounce
  useEffect(() => {
    if (notesDraft === (party?.notes ?? "")) return;
    const t = setTimeout(() => {
      saveNotesMutation.mutate(notesDraft);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft, party?.notes]);

  // Initialize edit form when party loads or dialog opens
  useEffect(() => {
    if (party && showEditDialog) {
      setEditData({
        name: party.name,
        targetAcquisitionMin: party.targetAcquisitionMin?.toString() || "",
        targetAcquisitionMax: party.targetAcquisitionMax?.toString() || "",
        budgetMin: party.budgetMin || "",
        budgetMax: party.budgetMax || "",
      });
    }
  }, [party, showEditDialog]);

  const updatePartyMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      return await apiRequest("PATCH", `/api/buying-parties/${partyId}`, {
        name: data.name,
        targetAcquisitionMin: data.targetAcquisitionMin ? parseInt(data.targetAcquisitionMin) : null,
        targetAcquisitionMax: data.targetAcquisitionMax ? parseInt(data.targetAcquisitionMax) : null,
        budgetMin: data.budgetMin || null,
        budgetMax: data.budgetMax || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/buying-parties/${partyId}`] });
      setShowEditDialog(false);
      toast({
        title: "Buying party updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update buying party. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    if (!editData.name.trim()) {
      toast({
        title: "Missing field",
        description: "Party name is required.",
        variant: "destructive",
      });
      return;
    }
    updatePartyMutation.mutate(editData);
  };

  const deletePartyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/buying-parties/${partyId}`);
    },
    onSuccess: () => {
      toast({
        title: "Buying party deleted",
        description: "The buying party has been permanently deleted.",
      });
      navigate("/buying-parties");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete buying party. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteParty = () => {
    deletePartyMutation.mutate();
    setShowDeleteDialog(false);
  };

  const addPartyContactMutation = useMutation({
    mutationFn: async (contact: Contact) => {
      return await apiRequest("POST", `/api/buying-parties/${partyId}/contacts`, {
        contactId: contact.id,
        ...(contact.role && { role: contact.role }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contacts", { entityId: partyId, entityType: "buying_party" }] });
      setShowConfirmAdd(false);
      setShowContactSelector(false);
      setSelectedContact(null);
      setContactSearch("");
      toast({
        title: "Contact added",
        description: "The contact has been added to this buying party.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowConfirmAdd(true);
  };

  const handleConfirmAdd = () => {
    if (selectedContact) {
      addPartyContactMutation.mutate(selectedContact);
    }
  };

  const filteredContacts = allContacts.filter(c => {
    const searchLower = contactSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.role.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  });

  if (!party) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // The query is already filtered by entityId and entityType, so all contacts are for this buying party
  const partyContacts = contacts;

  // Optional fields via "any" until shared types include them
  const targetIndustries: string[] = Array.isArray((party as any)?.targetIndustries)
    ? (party as any).targetIndustries
    : [];
  const operational: boolean = Boolean((party as any)?.operational);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/buying-parties")}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Buying Parties
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                data-testid="button-edit-party"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                data-testid="button-delete-party"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button size="sm" data-testid="button-schedule-meeting">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold" data-testid="text-party-name">
              {party.name}
            </h1>
            {/* Removed the 'interested' tag; interest is per deal-match */}
            <Badge variant={operational ? "default" : "secondary"} title="Operational buyer">
              {operational ? "Operational: Yes" : "Operational: No"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Party Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Party Information</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Target Acquisition</div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold" data-testid="text-acquisition">
                    {party.targetAcquisitionMin}-{party.targetAcquisitionMax}%
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Check Size Range</div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono font-semibold" data-testid="text-budget">
                    $
                    {party.budgetMin
                      ? parseFloat(party.budgetMin).toLocaleString()
                      : "0"}{" "}
                    - $
                    {party.budgetMax
                      ? parseFloat(party.budgetMax).toLocaleString()
                      : "0"}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Timeline</div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold" data-testid="text-timeline">
                    {party.timeline || "Not specified"}
                  </span>
                </div>
              </div>

              {/* Target Industries */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Target Industries</div>
                {targetIndustries.length > 0 ? (
                  <div className="flex flex-wrap gap-2" data-testid="chips-industries">
                    {targetIndustries.slice(0, 10).map((ind) => (
                      <Badge key={ind} variant="outline" className="text-xs">
                        {ind}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              {/* Operational yes/no */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Operational</div>
                <Badge
                  variant={operational ? "default" : "secondary"}
                  data-testid="badge-operational"
                >
                  {operational ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Contacts (scrollable) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Contacts</h3>
              <Button 
                size="sm" 
                variant="outline" 
                data-testid="button-add-contact"
                onClick={() => setShowContactSelector(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {isLoadingContacts ? (
                <LoadingState variant="list" count={3} />
              ) : (
                <>
                  {partyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-start justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm ">{contact.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{contact.role}</div>
                        {contact.email && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {contact.email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          data-testid={`button-email-${contact.id}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          data-testid={`button-call-${contact.id}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {partyContacts.length === 0 && (
                    <div className="text-sm text-muted-foreground">No contacts yet</div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Total Activities</span>
                <span className="font-semibold">{activities.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Documents</span>
                <span className="font-semibold">{documents.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Meetings Scheduled</span>
                <span className="font-semibold">
                  {activities.filter((a) => a.type === "meeting").length}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              Documents
            </TabsTrigger>
            <TabsTrigger value="meetings" data-testid="tab-meetings">
              Meetings
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-6">
              <button
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="w-full flex items-center justify-between text-lg font-semibold mb-4"
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
          </TabsContent>

          <TabsContent value="documents">
            {isLoadingDocuments ? (
              <LoadingState variant="grid" count={6} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <Card
                    key={doc.id}
                    className="p-4 hover-elevate transition-shadow"
                    data-testid={`card-doc-${doc.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-sm">{doc.name}</span>
                      </div>
                      <Badge
                        variant={doc.status === "signed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {doc.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {doc.createdAt && new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </Card>
                ))}
                {documents.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-muted-foreground">
                    No documents yet
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meetings">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Scheduled Meetings</h3>
                <Button size="sm" data-testid="button-schedule-new">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule New
                </Button>
              </div>
              <div className="space-y-4">
                {activities
                  .filter((a) => a.type === "meeting")
                  .map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-start justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{meeting.title}</h4>
                        {meeting.description && (
                          <div 
                            className="text-sm text-muted-foreground mb-2" 
                            dangerouslySetInnerHTML={{ __html: meeting.description }}
                          />
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {meeting.dueDate && (
                            <span>{new Date(meeting.dueDate).toLocaleString()}</span>
                          )}
                          {meeting.assignedTo && <span>{meeting.assignedTo}</span>}
                        </div>
                      </div>
                      <Badge
                        variant={meeting.status === "completed" ? "default" : "secondary"}
                      >
                        {meeting.status}
                      </Badge>
                    </div>
                  ))}
                {activities.filter((a) => a.type === "meeting").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No meetings scheduled
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Activity Timeline</h3>
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          activity.status === "completed"
                            ? "bg-chart-2/10 text-chart-2"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {activity.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <Badge
                          variant={activity.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
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
                        {activity.createdAt && (
                          <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No activity yet</div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Matches Kanban */}
        <div className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Matches</h3>
            </div>
            {isLoadingMatches ? (
              <LoadingState variant="inline" />
            ) : partyMatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No matches yet</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {["reached", "interested", "evaluating", "ioi sent", "loi sent", "exclusivity"].map((stage) => {
                  const stageMatches = partyMatches.filter(({ match }) => 
                    match.status?.toLowerCase() === stage.toLowerCase()
                  );
                  const stageLabel = stage.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  
                  return (
                    <div key={stage} className="bg-muted/30 rounded-lg p-3">
                      <div className="mb-3">
                        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {stageLabel}
                        </h4>
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {stageMatches.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {stageMatches.map(({ match, deal }) => (
                          <div
                            key={match.id}
                            className="bg-card border border-card-border rounded-md p-3 cursor-pointer hover-elevate active-elevate-2"
                            onClick={() => navigate(`/deals/${deal.id}`)}
                            data-testid={`match-card-${deal.id}`}
                          >
                            <div className="font-medium text-sm line-clamp-2">
                              {deal.companyName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Buying Party Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Buying Party</DialogTitle>
            <DialogDescription>
              Update the buying party information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Party Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                data-testid="input-edit-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-acq-min">Target Acquisition Min (%)</Label>
                <Input
                  id="edit-acq-min"
                  data-testid="input-edit-acq-min"
                  type="number"
                  value={editData.targetAcquisitionMin}
                  onChange={(e) => setEditData({ ...editData, targetAcquisitionMin: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-acq-max">Target Acquisition Max (%)</Label>
                <Input
                  id="edit-acq-max"
                  data-testid="input-edit-acq-max"
                  type="number"
                  value={editData.targetAcquisitionMax}
                  onChange={(e) => setEditData({ ...editData, targetAcquisitionMax: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-budget-min">Check Size Min ($)</Label>
                <Input
                  id="edit-budget-min"
                  data-testid="input-edit-budget-min"
                  type="number"
                  value={editData.budgetMin}
                  onChange={(e) => setEditData({ ...editData, budgetMin: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-budget-max">Check Size Max ($)</Label>
                <Input
                  id="edit-budget-max"
                  data-testid="input-edit-budget-max"
                  type="number"
                  value={editData.budgetMax}
                  onChange={(e) => setEditData({ ...editData, budgetMax: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updatePartyMutation.isPending}
              data-testid="button-save-edit"
            >
              {updatePartyMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Selection Dialog */}
      <Dialog open={showContactSelector} onOpenChange={setShowContactSelector}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Search and select a contact to add to this buying party
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Search by name, role, or email..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              data-testid="input-contact-search"
              className="mb-4"
            />
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 border border-border rounded-md hover-elevate cursor-pointer"
                  onClick={() => handleSelectContact(contact)}
                  data-testid={`contact-option-${contact.id}`}
                >
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">{contact.role}</div>
                  {contact.email && (
                    <div className="text-xs text-muted-foreground mt-1">{contact.email}</div>
                  )}
                </div>
              ))}
              {filteredContacts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No contacts found
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Add Contact Dialog */}
      <Dialog open={showConfirmAdd} onOpenChange={setShowConfirmAdd}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Add Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to add this contact to the buying party?
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="py-4">
              <div className="p-4 border border-border rounded-md">
                <div className="font-medium">{selectedContact.name}</div>
                <div className="text-sm text-muted-foreground">{selectedContact.role}</div>
                {selectedContact.email && (
                  <div className="text-xs text-muted-foreground mt-1">{selectedContact.email}</div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmAdd(false);
                setSelectedContact(null);
              }}
              data-testid="button-cancel-add-contact"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdd}
              disabled={addPartyContactMutation.isPending}
              data-testid="button-confirm-add-contact"
            >
              {addPartyContactMutation.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Buying Party</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this buying party? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 border border-border rounded-md bg-muted/50">
              <div className="font-medium">{party?.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                All associated data will be permanently removed.
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteParty}
              disabled={deletePartyMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deletePartyMutation.isPending ? "Deleting..." : "Delete Party"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

