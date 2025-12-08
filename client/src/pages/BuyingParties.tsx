import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { BuyingParty, Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, CheckSquare, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable, Column } from "@/components/DataTable";

// Extended BuyingParty type with contacts from API
type BuyingPartyWithContacts = BuyingParty & {
  contacts?: Contact[];
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";


export default function BuyingParties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showNewPartyDialog, setShowNewPartyDialog] = useState(false);
  const [newPartyData, setNewPartyData] = useState({
    name: "",
    targetAcquisitionMin: "",
    targetAcquisitionMax: "",
    budgetMin: "",
    budgetMax: "",
    timeline: "",
  });

  // Selection state
  const [selectedParties, setSelectedParties] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: parties = [], isLoading } = useQuery<BuyingPartyWithContacts[]>({
    queryKey: ["/api/buying-parties"],
  });

  const createPartyMutation = useMutation({
    mutationFn: async (partyData: typeof newPartyData) => {
      if (!partyData.name.trim()) {
        throw new Error("Party name is required");
      }
      
      const payload: any = {
        name: partyData.name.trim(),
      };
      
      if (partyData.targetAcquisitionMin) {
        payload.targetAcquisitionMin = parseInt(partyData.targetAcquisitionMin);
      }
      if (partyData.targetAcquisitionMax) {
        payload.targetAcquisitionMax = parseInt(partyData.targetAcquisitionMax);
      }
      if (partyData.budgetMin) {
        payload.budgetMin = parseFloat(partyData.budgetMin).toString();
      }
      if (partyData.budgetMax) {
        payload.budgetMax = parseFloat(partyData.budgetMax).toString();
      }
      if (partyData.timeline.trim()) {
        payload.timeline = partyData.timeline.trim();
      }
      
      const response = await apiRequest("POST", "/api/buying-parties", payload);
      return (await response.json()) as BuyingParty;
    },
    onSuccess: (newParty) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buying-parties"] });
      setShowNewPartyDialog(false);
      setNewPartyData({
        name: "",
        targetAcquisitionMin: "",
        targetAcquisitionMax: "",
        budgetMin: "",
        budgetMax: "",
        timeline: "",
      });
      toast({
        title: "Party created",
        description: `${newParty.name} has been added to the buying parties.`,
      });
      navigate(`/buying-parties/${newParty.id}`);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to create party. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deletePartiesMutation = useMutation({
    mutationFn: async (partyIds: string[]) => {
      // Delete parties one by one (could be optimized with batch endpoint if available)
      const results = await Promise.allSettled(
        partyIds.map(id => apiRequest("DELETE", `/api/buying-parties/${id}`))
      );

      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to delete ${failures.length} of ${partyIds.length} parties`);
      }

      return results.length;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buying-parties"] });
      setSelectedParties(new Set());
      setSelectMode(false);
      setShowDeleteDialog(false);
      toast({
        title: "Parties deleted",
        description: `${deletedCount} buying ${deletedCount === 1 ? 'party' : 'parties'} ${deletedCount === 1 ? 'has' : 'have'} been permanently deleted.`,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete parties. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreateParty = () => {
    if (!newPartyData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Party name is required.",
        variant: "destructive",
      });
      return;
    }
    createPartyMutation.mutate(newPartyData);
  };

  // Handle selection changes
  const handleSelectParty = (partyId: string, checked: boolean) => {
    setSelectedParties(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(partyId);
      } else {
        newSet.delete(partyId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParties(new Set(parties.map(party => party.id)));
    } else {
      setSelectedParties(new Set());
    }
  };

  // Define table columns
  const columns: Column<BuyingPartyWithContacts>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      filterable: true,
      render: (value, party) => (
        <div className="font-medium text-foreground" data-testid={`text-name-${party.id}`}>
          {value}
        </div>
      ),
      filterValue: (party) => party.name,
      sortValue: (party) => party.name.toLowerCase(),
    },
    {
      key: "targetAcquisitionMin",
      header: "Target Acquisition",
      sortable: true,
      filterable: true,
      render: (value, party) => (
        <span data-testid={`text-acquisition-${party.id}`}>
          {party.targetAcquisitionMin && party.targetAcquisitionMax
            ? `${party.targetAcquisitionMin}-${party.targetAcquisitionMax}%`
            : "N/A"}
        </span>
      ),
      filterValue: (party) =>
        party.targetAcquisitionMin && party.targetAcquisitionMax
          ? `${party.targetAcquisitionMin}-${party.targetAcquisitionMax}%`
          : "N/A",
      sortValue: (party) => party.targetAcquisitionMin || 0,
    },
    {
      key: "budgetMin",
      header: "Budget Range",
      sortable: true,
      filterable: true,
      render: (value, party) => (
        <span className="font-mono" data-testid={`text-budget-${party.id}`}>
          {party.budgetMin && party.budgetMax
            ? `$${parseFloat(party.budgetMin).toLocaleString()} - $${parseFloat(party.budgetMax).toLocaleString()}`
            : "N/A"}
        </span>
      ),
      filterValue: (party) =>
        party.budgetMin && party.budgetMax
          ? `$${parseFloat(party.budgetMin).toLocaleString()} - $${parseFloat(party.budgetMax).toLocaleString()}`
          : "N/A",
      sortValue: (party) => party.budgetMin ? parseFloat(party.budgetMin) : 0,
    },
    {
      key: "timeline",
      header: "Timeline",
      sortable: true,
      filterable: true,
      render: (value, party) => (
        <span data-testid={`text-timeline-${party.id}`}>
          {value || "N/A"}
        </span>
      ),
      filterValue: (party) => party.timeline || "N/A",
      sortValue: (party) => party.timeline || "",
    },
    {
      key: "contacts",
      header: "Contacts",
      sortable: true,
      filterable: true,
      render: (value, party) => {
        const contactNames = party.contacts?.map(c => c.name).join(", ") || "";
        return (
          <span className="line-clamp-1" title={contactNames} data-testid={`text-contacts-${party.id}`}>
            {contactNames || "No contacts"}
          </span>
        );
      },
      filterValue: (party) => party.contacts?.map(c => c.name).join(", ") || "No contacts",
      sortValue: (party) => party.contacts?.length || 0,
    },
  ];


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Loading buying parties...</div>
      </div>
    );
  }


  return (
    <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Buying Parties</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {parties.length} potential buyers
            {selectedParties.size > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({selectedParties.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedParties.size > 0 && (
            <Button
              variant="destructive"
              size="default"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deletePartiesMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedParties.size})
            </Button>
          )}
          <Button
            variant={selectMode ? "default" : "outline"}
            size="default"
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) {
                // Clear selection when exiting select mode
                setSelectedParties(new Set());
              }
            }}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {selectMode ? "Cancel Select" : "Select"}
          </Button>
          <Button
            size="default"
            data-testid="button-new-buyer"
            onClick={() => setShowNewPartyDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Party
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={parties}
        columns={columns}
        selectable={selectMode}
        selectedItems={selectedParties}
        onSelectItem={handleSelectParty}
        onSelectAll={handleSelectAll}
        onRowClick={!selectMode ? (party) => navigate(`/buying-parties/${party.id}`) : undefined}
        loading={isLoading}
        emptyMessage="No buying parties yet. Add your first buyer to get started."
        getItemId={(party) => party.id}
      />

      {/* New Party Dialog */}
      <Dialog open={showNewPartyDialog} onOpenChange={setShowNewPartyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Buying Party</DialogTitle>
            <DialogDescription>
              Add a new potential buyer to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Party Name *</Label>
              <Input
                id="name"
                value={newPartyData.name}
                onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })}
                placeholder="e.g., Acme Corp"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAcquisitionMin">Target Acquisition Min (%)</Label>
                <Input
                  id="targetAcquisitionMin"
                  type="number"
                  value={newPartyData.targetAcquisitionMin}
                  onChange={(e) => setNewPartyData({ ...newPartyData, targetAcquisitionMin: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAcquisitionMax">Target Acquisition Max (%)</Label>
                <Input
                  id="targetAcquisitionMax"
                  type="number"
                  value={newPartyData.targetAcquisitionMax}
                  onChange={(e) => setNewPartyData({ ...newPartyData, targetAcquisitionMax: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetMin">Check Size Min ($)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={newPartyData.budgetMin}
                  onChange={(e) => setNewPartyData({ ...newPartyData, budgetMin: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax">Check Size Max ($)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={newPartyData.budgetMax}
                  onChange={(e) => setNewPartyData({ ...newPartyData, budgetMax: e.target.value })}
                  placeholder="1000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Timeline</Label>
              <Input
                id="timeline"
                value={newPartyData.timeline}
                onChange={(e) => setNewPartyData({ ...newPartyData, timeline: e.target.value })}
                placeholder="e.g., Q1 2024"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowNewPartyDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateParty}
              disabled={createPartyMutation.isPending}
            >
              {createPartyMutation.isPending ? "Creating..." : "Create Party"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Parties</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedParties.size} buying {selectedParties.size === 1 ? 'party' : 'parties'}?
              This action cannot be undone and will permanently remove {selectedParties.size === 1 ? 'it' : 'them'} from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePartiesMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePartiesMutation.mutate(Array.from(selectedParties))}
              disabled={deletePartiesMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePartiesMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
