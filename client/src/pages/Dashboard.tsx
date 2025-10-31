import { useQuery } from "@tanstack/react-query";
import { Deal } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Clock, 
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
}

function KPICard({ title, value, change, changeType, icon }: KPICardProps) {
  return (
    <Card className="p-6 hover-elevate transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          {icon}
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            changeType === "positive" && "text-chart-2",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground"
          )}>
            <TrendingUp className="w-4 h-4" />
            {change}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold mb-1" data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {value}
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  // Calculate metrics
  const totalValue = deals.reduce((sum, deal) => sum + parseFloat(deal.revenue), 0);
  const totalDeals = deals.length;
  const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
  const soldDeals = deals.filter(d => d.stage === "sold").length;
  const conversionRate = totalDeals > 0 ? (soldDeals / totalDeals) * 100 : 0;
  const avgTimeInStage = totalDeals > 0 
    ? deals.reduce((sum, deal) => sum + deal.ageInStage, 0) / totalDeals 
    : 0;

  // Deals by stage
  const dealsByStage = deals.reduce((acc, deal) => {
    acc[deal.stage] = (acc[deal.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stageLabels: Record<string, string> = {
    onboarding: "Onboarding",
    valuation: "Valuation",
    buyer_matching: "Buyer Matching",
    due_diligence: "Due Diligence",
    sold: "Sold",
  };

  return (
    <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your deal pipeline performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Pipeline Value"
          value={`$${totalValue.toLocaleString()}`}
          change="+12.5%"
          changeType="positive"
          icon={<DollarSign className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Active Deals"
          value={totalDeals.toString()}
          change="+8"
          changeType="positive"
          icon={<Target className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Avg Deal Size"
          value={`$${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          change="+5.2%"
          changeType="positive"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          change="-2.1%"
          changeType="negative"
          icon={<Activity className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Stage */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Deals by Stage</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(dealsByStage).map(([stage, count]) => {
              const percentage = totalDeals > 0 ? (count / totalDeals) * 100 : 0;
              const stageColors: Record<string, string> = {
                onboarding: "bg-blue-500",
                valuation: "bg-purple-500",
                buyer_matching: "bg-amber-500",
                due_diligence: "bg-orange-500",
                sold: "bg-emerald-500",
              };
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{stageLabels[stage]}</span>
                    <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full", stageColors[stage])}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Pipeline Velocity */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Pipeline Velocity</h3>
          </div>
          <div className="space-y-6">
            <div>
              <div className="text-3xl font-bold mb-1">
                {avgTimeInStage.toFixed(0)} days
              </div>
              <div className="text-sm text-muted-foreground">Average time in stage</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold mb-1">{soldDeals}</div>
                <div className="text-xs text-muted-foreground">Closed Deals</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold mb-1">{totalDeals - soldDeals}</div>
                <div className="text-xs text-muted-foreground">In Pipeline</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Revenue by Stage */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Revenue by Stage</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(dealsByStage).map(([stage]) => {
              const stageDeals = deals.filter(d => d.stage === stage);
              const stageRevenue = stageDeals.reduce((sum, deal) => sum + parseFloat(deal.revenue), 0);
              const maxRevenue = Math.max(...Object.keys(dealsByStage).map(s => 
                deals.filter(d => d.stage === s).reduce((sum, deal) => sum + parseFloat(deal.revenue), 0)
              ));
              const percentage = maxRevenue > 0 ? (stageRevenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{stageLabels[stage]}</span>
                    <span className="text-sm font-mono">${stageRevenue.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Deals */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Top Deals</h3>
          </div>
          <div className="space-y-3">
            {deals
              .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
              .slice(0, 5)
              .map((deal) => (
                <div key={deal.id} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{deal.companyName}</div>
                    <div className="text-xs text-muted-foreground">{stageLabels[deal.stage]}</div>
                  </div>
                  <div className="text-sm font-mono font-semibold">
                    ${parseFloat(deal.revenue).toLocaleString()}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
