import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { MATCH_STAGES } from "./MatchStagePill";

type Match = {
  id: string;
  stage?: string | null;
};

export default function BuyerChecklist({ matchId, expandedDefault = false }: { matchId: string; expandedDefault?: boolean }) {
  const qc = useQueryClient();

  // Fetch the current match to get its stage
  const { data: match, isLoading } = useQuery<Match>({
    queryKey: ["/api/matches", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) throw new Error("Failed to fetch match");
      return res.json();
    },
    staleTime: 10_000,
  });

  // Mutation to update the match stages
  const updateStagesMutation = useMutation({
    mutationFn: async (stages: string[]) => {
      const stagesString = stages.join(',');
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: stagesString }),
      });
      if (!res.ok) throw new Error("Failed to update stages");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      qc.invalidateQueries({ queryKey: ["/api/deals", match?.dealId, "buyers"] });
    },
  });

  const currentStages = match?.stage ? match.stage.split(',').filter(Boolean) : [];
  const isUpdating = updateStagesMutation.isPending;

  const handleStageChange = (stageKey: string, checked: boolean) => {
    const newStages = checked
      ? [...currentStages, stageKey]
      : currentStages.filter(s => s !== stageKey);

    updateStagesMutation.mutate(newStages);
  };

  return (
    <div className="rounded-md border border-border bg-muted/20">
      <div className="p-2.5 border-b border-border flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage Checklist</div>
        {(isLoading || isUpdating) && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="p-1.5">
        {isLoading && <div className="text-xs text-muted-foreground p-2">Loading…</div>}
        {!isLoading && MATCH_STAGES.map((stage) => (
          <label
            key={stage.key}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer transition-colors"
            data-testid={`checkbox-${matchId}-${stage.key}`}
          >
            <input
              type="checkbox"
              className="accent-foreground cursor-pointer"
              checked={currentStages.includes(stage.key)}
              onChange={(e) => handleStageChange(stage.key, e.target.checked)}
              disabled={isUpdating}
              data-testid={`checkbox-input-${matchId}-${stage.key}`}
            />
            <span className="text-sm">{stage.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
