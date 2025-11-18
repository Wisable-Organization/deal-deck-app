import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Deal, dealStages, Document, User } from "@shared/schema";
import { DealCard } from "@/components/DealCard";
import { Button } from "@/components/ui/button";
import { Filter, Plus } from "lucide-react";
import { useNavigate } from "react-router";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const stageLabels: Record<string, string> = {
  onboarding: "Onboarding",
  valuation: "Valuation",
  buyer_matching: "Buyer Matching",
  due_diligence: "Due Diligence",
  sold: "Sold",
};

export default function DealPipeline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [newDealData, setNewDealData] = useState({
    companyName: "",
    revenue: "",
    ownerId: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      return await apiRequest("PATCH", `/api/deals/${dealId}`, { stage });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${variables.dealId}`] });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (dealData: typeof newDealData) => {
      const revenueNum = parseFloat(dealData.revenue);
      if (isNaN(revenueNum) || revenueNum <= 0) {
        throw new Error("Invalid revenue value");
      }
      
      const response = await apiRequest("POST", "/api/deals", {
        companyName: dealData.companyName.trim(),
        revenue: revenueNum.toString(),
        ownerId: dealData.ownerId,
        stage: "onboarding",
        priority: dealData.priority,
        touches: 0,
        ageInStage: 0,
        healthScore: 85,
      });
      return (await response.json()) as Deal;
    },
    onSuccess: (newDeal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setShowNewDealDialog(false);
      setNewDealData({ companyName: "", revenue: "", ownerId: "", priority: "medium" });
      toast({
        title: "Deal created",
        description: `${newDeal.companyName} has been added to the pipeline.`,
      });
      navigate(`/deals/${newDeal.id}`);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to create deal. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreateDeal = () => {
    if (!newDealData.companyName.trim() || !newDealData.revenue || !newDealData.ownerId) {
      toast({
        title: "Missing fields",
        description: "Please fill in company name, revenue, and owner.",
        variant: "destructive",
      });
      return;
    }
    
    const revenue = parseFloat(newDealData.revenue);
    if (isNaN(revenue) || revenue <= 0) {
      toast({
        title: "Invalid revenue",
        description: "Please enter a valid revenue amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    
    createDealMutation.mutate(newDealData);
  };

  const hasValuationDocument = useMemo(() => {
    const valuationDocs = new Set<string>();
    documents.forEach(doc => {
      if (doc.dealId && doc.name?.toLowerCase().includes('valuation')) {
        valuationDocs.add(doc.dealId);
      }
    });
    return valuationDocs;
  }, [documents]);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    
    if (!draggedDealId) return;
    
    const draggedDeal = deals.find(d => d.id === draggedDealId);
    if (!draggedDeal) return;
    
    const isLeavingOnboarding = draggedDeal.stage === "onboarding" && targetStage !== "onboarding";
    const hasValuation = hasValuationDocument.has(draggedDealId);
    
    if (isLeavingOnboarding && !hasValuation) {
      e.dataTransfer.dropEffect = "none";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedDealId) {
      setDraggedDealId(null);
      return;
    }

    const draggedDeal = deals.find(d => d.id === draggedDealId);
    if (!draggedDeal) {
      setDraggedDealId(null);
      return;
    }

    const isLeavingOnboarding = draggedDeal.stage === "onboarding" && targetStage !== "onboarding";
    const hasValuation = hasValuationDocument.has(draggedDealId);

    if (isLeavingOnboarding && !hasValuation) {
      toast({
        title: "Needs Valuation",
        variant: "destructive",
      });
      setDraggedDealId(null);
      return;
    }

    await updateStageMutation.mutateAsync({ dealId: draggedDealId, stage: targetStage });
    setDraggedDealId(null);
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter((deal) => deal.stage === stage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Loading deals...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Deal Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {deals.length} deals across {dealStages.length} stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="default" data-testid="button-filter">
            <Filter className="w-4 h-4 mr-2" />
            Revenue Range
          </Button>
          <Button variant="outline" size="default" data-testid="button-industry">
            <Filter className="w-4 h-4 mr-2" />
            Industry
          </Button>
          <Button 
            size="default" 
            data-testid="button-new-deal"
            onClick={() => setShowNewDealDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {dealStages.map((stage) => {
          const stageDeals = getDealsByStage(stage);
          const draggedDeal = draggedDealId ? deals.find(d => d.id === draggedDealId) : null;
          const isLeavingOnboarding = draggedDeal?.stage === "onboarding" && stage !== "onboarding";
          const hasValuation = draggedDealId ? hasValuationDocument.has(draggedDealId) : false;
          const isInvalidDrop = draggedDealId && isLeavingOnboarding && !hasValuation;

          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDrop={(e) => handleDrop(e, stage)}
              className={cn(
                "bg-muted/30 rounded-lg p-4 min-h-[600px] transition-all duration-200",
                draggedDealId && "ring-2 ring-primary/20",
                isInvalidDrop && "opacity-40 grayscale cursor-not-allowed"
              )}
              data-testid={`column-${stage}`}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stageLabels[stage]}
                  </h3>
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {stageDeals.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {stageDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDragStart={handleDragStart}
                    onClick={(dealId) => navigate(`/deals/${dealId}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Deal Dialog */}
      <Dialog open={showNewDealDialog} onOpenChange={setShowNewDealDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
            <DialogDescription>
              Add a new deal to the pipeline. It will start in the Onboarding stage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                data-testid="input-company-name"
                placeholder="e.g., TechFlow Industries"
                value={newDealData.companyName}
                onChange={(e) => setNewDealData({ ...newDealData, companyName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="revenue">
                Annual Revenue <span className="text-destructive">*</span>
              </Label>
              <Input
                id="revenue"
                data-testid="input-revenue"
                type="number"
                placeholder="e.g., 5000000"
                value={newDealData.revenue}
                onChange={(e) => setNewDealData({ ...newDealData, revenue: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerId">
                Deal Owner <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newDealData.ownerId}
                onValueChange={(value) => setNewDealData({ ...newDealData, ownerId: value })}
              >
                <SelectTrigger id="ownerId" data-testid="select-owner">
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
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newDealData.priority}
                onValueChange={(value: "low" | "medium" | "high") => 
                  setNewDealData({ ...newDealData, priority: value })
                }
              >
                <SelectTrigger id="priority" data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowNewDealDialog(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDeal}
              disabled={createDealMutation.isPending}
              data-testid="button-create"
            >
              {createDealMutation.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
