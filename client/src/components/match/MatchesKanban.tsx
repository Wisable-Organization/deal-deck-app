import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MatchStagePill, { MATCH_STAGES } from "./MatchStagePill";

type PartyMatchRow = {
  match: { id: string; stage?: string | null; status?: string | null };
  deal: { id: string; companyName: string; stage?: string | null };
};

async function fetchMatchesEither(partyId: string): Promise<PartyMatchRow[]> {
  const urls = [
    `/api/buying-parties/${partyId}/matches`,
    `/api/matches?partyId=${partyId}`,
  ];
  for (const url of urls) {
    const r = await fetch(url);
    if (r.ok) return r.json();
  }
  return [];
}

export default function MatchesKanban({ partyId }: { partyId: string }) {
  const navigate = useNavigate();

  const { data: rows = [] } = useQuery<PartyMatchRow[]>({
    queryKey: ["party-matches", partyId],
    queryFn: () => fetchMatchesEither(partyId),
    enabled: !!partyId,
  });

  const byStage = new Map<string, PartyMatchRow[]>();
  MATCH_STAGES.forEach((s) => byStage.set(s.key, []));
  rows.forEach((row) => {
    const key = (row.match.stage || row.match.status || "new") as string;
    if (!byStage.has(key)) byStage.set(key, []);
    byStage.get(key)!.push(row);
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-[900px]">
        {MATCH_STAGES.map((col) => (
          <div key={col.key} className="w-64 shrink-0">
            <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {col.label}
              <Badge variant="secondary" className="ml-2">
                {byStage.get(col.key)?.length ?? 0}
              </Badge>
            </div>
            <Card className="p-2 min-h-[220px]">
              <div className="space-y-2">
                {(byStage.get(col.key) ?? []).map(({ match, deal }) => (
                  <div
                    key={match.id}
                    className="p-3 border border-border rounded-md hover-elevate cursor-pointer"
                    onClick={() => navigate(`/deals/${deal.id}`)}
                  >
                    <div className="text-sm font-medium line-clamp-2">{deal.companyName}</div>
                    <div className="mt-2">
                      <MatchStagePill matchId={match.id} stage={match.stage ?? match.status ?? undefined} />
                    </div>
                  </div>
                ))}
                {(byStage.get(col.key) ?? []).length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">No items</div>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
