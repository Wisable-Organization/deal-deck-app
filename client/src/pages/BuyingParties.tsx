import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { BuyingParty, Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BuyingParties() {
  const navigate = useNavigate();

  const { data: parties = [], isLoading } = useQuery<BuyingParty[]>({
    queryKey: ["/api/buying-parties"],
  });

  const { data: allContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

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
        <Button size="default" data-testid="button-new-buyer">
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
    </div>
  );
}
