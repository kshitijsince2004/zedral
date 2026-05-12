import { cn } from "@/lib/utils";

interface Props {
  pct: number;
  plannedDurationMs: number;
  elapsedMs: number;
}

export function ProgressBar({ pct, plannedDurationMs, elapsedMs }: Props) {
  const overdueMs = elapsedMs - plannedDurationMs;
  const overdue = overdueMs > 0;
  const ratio = elapsedMs / plannedDurationMs;
  let color = "bg-status-running";
  if (ratio > 1) color = "bg-status-reject";
  else if (ratio > 0.9) color = "bg-status-stopped";
  const overdueMin = Math.round(overdueMs / 60000);
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">
          {Math.round(pct)}%
        </span>
      </div>
      {overdue && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-status-reject/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-status-reject">
          ⚠ Overdue {overdueMin}m
        </div>
      )}
    </div>
  );
}
