import { Deal } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface DealCardProps {
  deal: Deal;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onClick: (dealId: string) => void;
}

const stageColors: Record<string, string> = {
  onboarding: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  valuation: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  buyer_matching: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  due_diligence: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  sold: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-muted",
};

export function DealCard({ deal, onDragStart, onClick }: DealCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => onClick(deal.id)}
      data-testid={`card-deal-${deal.id}`}
      className="bg-card border border-card-border rounded-md p-4 cursor-pointer hover-elevate active-elevate-2 transition-shadow"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-card-foreground line-clamp-1" data-testid={`text-company-${deal.id}`}>
            {deal.companyName}
          </h3>
          <Badge 
            className={cn("shrink-0 text-xs", priorityColors[deal.priority])}
            data-testid={`badge-priority-${deal.id}`}
          >
            {deal.priority}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="text-2xl font-mono font-semibold text-chart-2" data-testid={`text-revenue-${deal.id}`}>
            ${parseFloat(deal.revenue).toLocaleString()} ARR
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center space-x-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span data-testid={`text-nextstep-${deal.id}`}>
              {deal.nextStepDays ? `${deal.nextStepDays} days` : 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            <span data-testid={`text-touches-${deal.id}`}>{deal.touches}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-card-border">
          <div className="text-xs text-muted-foreground" data-testid={`text-owner-${deal.id}`}>
            {deal.owner}
          </div>
        </div>
      </div>
    </div>
  );
}
