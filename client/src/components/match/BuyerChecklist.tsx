import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  note?: string;
  ts?: string;
};

const DEFAULT_ITEMS: ChecklistItem[] = [
  { key: "nda_sent", label: "NDA sent", done: false },
  { key: "nda_signed", label: "NDA signed", done: false },
  { key: "cim_sent", label: "CIM sent", done: false },
  { key: "cim_viewed", label: "CIM viewed", done: false },
  { key: "intro_call", label: "Intro call held", done: false },
  { key: "share_financials", label: "Shared financials", done: false },
  { key: "receive_ioi", label: "Received IOI", done: false },
];

export default function BuyerChecklist({ matchId, expandedDefault = false }: { matchId: string; expandedDefault?: boolean }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ items: ChecklistItem[] } | null>({
    queryKey: ["/api/matches", matchId, "checklist"],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${matchId}/checklist`);
      if (!res.ok) return { items: DEFAULT_ITEMS };
      return res.json();
    },
    staleTime: 10_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (items: ChecklistItem[]) => {
      const res = await fetch(`/api/matches/${matchId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed to save checklist");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/matches", matchId, "checklist"] }),
  });

  const items = data?.items ?? DEFAULT_ITEMS;

  const toggle = (key: string) => {
    const next = items.map((i) => (i.key === key ? { ...i, done: !i.done } : i));
    saveMutation.mutate(next);
  };

  const addItem = () => {
    const label = prompt("New checklist item");
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const next = [...items, { key, label, done: false }];
    saveMutation.mutate(next);
  };

  return (
    <div className="rounded-md border border-border bg-muted/20">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage Checklist</div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addItem} title="Add checklist item" data-testid={`button-add-item-${matchId}`}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-2">
        {isLoading && <div className="text-xs text-muted-foreground p-2">Loading…</div>}
        {!isLoading && items.map((i) => (
          <label key={i.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
            <input
              type="checkbox"
              className="accent-foreground"
              checked={i.done}
              onChange={() => toggle(i.key)}
              data-testid={`check-${matchId}-${i.key}`}
            />
            <span className={i.done ? "line-through text-muted-foreground text-sm" : "text-sm"}>{i.label}</span>
            {i.done && <Check className="w-4 h-4 text-muted-foreground ml-auto" />}
          </label>
        ))}
        {!isLoading && items.length === 0 && (
          <div className="text-xs text-muted-foreground p-2">No items yet</div>
        )}
      </div>
    </div>
  );
}
