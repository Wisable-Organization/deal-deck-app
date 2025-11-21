import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const MATCH_STAGES: Array<{ key: string; label: string }> = [
  { key: "new", label: "New" },
  { key: "nda_sent", label: "NDA Sent" },
  { key: "nda_signed", label: "NDA Signed" },
  { key: "cim_sent", label: "CIM Sent" },
  { key: "cim_viewed", label: "CIM Viewed" },
  { key: "intro_call", label: "Intro Call" },
  { key: "diligence", label: "Diligence" },
  { key: "ioi", label: "IOI" },
  { key: "loi", label: "LOI" },
  { key: "under_contract", label: "Under Contract" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const stageColor = (key?: string) =>
  ({
    new: "bg-muted text-muted-foreground",
    nda_sent: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    nda_signed: "bg-amber-600/10 text-amber-800 dark:text-amber-300 border-amber-600/20",
    cim_sent: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    cim_viewed: "bg-blue-600/10 text-blue-800 dark:text-blue-300 border-blue-600/20",
    intro_call: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    diligence: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    ioi: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    loi: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    under_contract: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
    won: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    lost: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  } as Record<string, string>)[key ?? "new"] ?? "bg-muted text-muted-foreground";

export default function MatchStagePill({
  matchId,
  stage,
  onChanged,
}: {
  matchId: string;
  stage?: string | null;
  onChanged?: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Handle comma-separated stages - show the first one or "New" if none
  const stages = stage ? stage.split(',').filter(Boolean) : [];
  const currentStage = stages.length > 0 ? stages[0] : "new";
  const current = MATCH_STAGES.find((s) => s.key === currentStage)?.label ?? "New";

  async function setStage(nextKey: string) {
    // For MatchStagePill, when selecting a stage, set it as the single stage
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: nextKey }),
    }).catch(() => {}); // swallow for MVP
    onChanged?.(nextKey);
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        className={cn(
          "px-2.5 py-1 text-xs rounded-full border",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <Badge className={cn("text-[11px] border", stageColor(stage ?? undefined))}>
          {current}
        </Badge>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border bg-popover shadow z-50 max-h-64 overflow-y-auto">
          {MATCH_STAGES.map((s) => (
            <button
              key={s.key}
              className={cn(
                "w-full px-3 py-2 text-left text-xs hover:bg-muted",
                s.key === currentStage && "bg-muted"
              )}
              onClick={() => setStage(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
