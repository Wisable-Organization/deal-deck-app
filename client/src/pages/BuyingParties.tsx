import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { BuyingParty, Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  const { data: parties = [], isLoading } = useQuery<BuyingParty[]>({
    queryKey: ["/api/buying-parties"],
  });

  const { data: allContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Loading buying parties...</div>
      </div>
    );
  }

  const getPartyContacts = (partyId: string) => {
    return allContacts.filter(c => c.entityType === "buying_party" && c.entityId === partyId);
  };

  return (
    <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Buying Parties</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {parties.length} potential buyers
          </p>
        </div>
        <Button 
          size="default" 
          data-testid="button-new-buyer"
          onClick={() => setShowNewPartyDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Party
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Target Acquisition
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Budget Range
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Timeline
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contacts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parties.map((party) => {
              const partyContacts = getPartyContacts(party.id);
              const contactNames = partyContacts.map(c => c.name).join(", ");
              
              return (
                <tr
                  key={party.id}
                  onClick={() => navigate(`/buying-parties/${party.id}`)}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  data-testid={`row-buyer-${party.id}`}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground" data-testid={`text-name-${party.id}`}>
                      {party.name}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground" data-testid={`text-acquisition-${party.id}`}>
                    {party.targetAcquisitionMin && party.targetAcquisitionMax
                      ? `${party.targetAcquisitionMin}-${party.targetAcquisitionMax}%`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-4 text-sm font-mono text-muted-foreground" data-testid={`text-budget-${party.id}`}>
                    {party.budgetMin && party.budgetMax
                      ? `$${parseFloat(party.budgetMin).toLocaleString()} - $${parseFloat(party.budgetMax).toLocaleString()}`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground" data-testid={`text-timeline-${party.id}`}>
                    {party.timeline || "N/A"}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground" data-testid={`text-contacts-${party.id}`}>
                    <span className="line-clamp-1" title={contactNames}>
                      {contactNames || "No contacts"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {parties.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No buying parties yet. Add your first buyer to get started.
        </div>
      )}

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
                <Label htmlFor="budgetMin">Budget Min ($)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={newPartyData.budgetMin}
                  onChange={(e) => setNewPartyData({ ...newPartyData, budgetMin: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax">Budget Max ($)</Label>
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
    </div>
  );
}
