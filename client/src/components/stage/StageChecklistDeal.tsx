import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  note?: string;
  ts?: string;
};

const DEFAULT_STAGE_ITEMS: ChecklistItem[] = [
  { key: "fs1_received", label: "Financial statement 1 received", done: false },
  { key: "fs2_received", label: "Financial statement 2 received", done: false },
  { key: "fs3_received", label: "Financial statement 3 received", done: false },
  { key: "docs_reviewed", label: "Docs reviewed", done: false },
  { key: "valuation_made", label: "Valuation made", done: false },
  { key: "listing_price_set", label: "Listing price set", done: false },
];

export default function StageChecklistDeal({ dealId, stageLabel }: { dealId: string; stageLabel?: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ items: ChecklistItem[] } | null>({
    queryKey: ["/api/deals", dealId, "stage-checklist"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/stage-checklist`);
      if (!res.ok) return { items: DEFAULT_STAGE_ITEMS };
      return res.json();
    },
    enabled: !!dealId,
    staleTime: 10_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (items: ChecklistItem[]) => {
      const res = await fetch(`/api/deals/${dealId}/stage-checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed to save stage checklist");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/deals", dealId, "stage-checklist"] }),
  });

  const items = data?.items ?? DEFAULT_STAGE_ITEMS;

  const toggle = (key: string) => {
    const next = items.map((i) => (i.key === key ? { ...i, done: !i.done } : i));
    saveMutation.mutate(next);
  };

  const addItem = () => {
    const label = prompt("New stage checklist item");
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const next = [...items, { key, label, done: false }];
    saveMutation.mutate(next);
  };

  return (
    <div className="rounded-md border border-border bg-muted/20">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stage Checklist{stageLabel ? ` • ${stageLabel}` : ""}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addItem} title="Add item" data-testid="button-add-stage-item">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-2">
        {isLoading && <div className="text-xs text-muted-foreground p-2">Loading…</div>}
        {!isLoading &&
          items.map((i) => (
            <label key={i.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                className="accent-foreground"
                checked={i.done}
                onChange={() => toggle(i.key)}
                data-testid={`stage-check-${i.key}`}
              />
              <span className={i.done ? "line-through text-muted-foreground text-sm" : "text-sm"}>{i.label}</span>
            </label>
          ))}
        {!isLoading && items.length === 0 && (
          <div className="text-xs text-muted-foreground p-2">No items yet</div>
        )}
      </div>
    </div>
  );
}
