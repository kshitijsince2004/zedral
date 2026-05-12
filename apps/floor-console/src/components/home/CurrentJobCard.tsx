import { useFloorConsole, selectActiveItem } from "@/store/floorConsoleStore";
import { StatusPill } from "@/components/shared/StatusPill";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ElapsedTimer } from "@/components/shared/ElapsedTimer";
import { Package } from "lucide-react";

interface Props {
  onCoilTap?: () => void;
}

export function CurrentJobCard({ onCoilTap }: Props) {
  const item = useFloorConsole(selectActiveItem);
  const lineStatus = useFloorConsole((s) => s.lineStatus);
  const stoppage = useFloorConsole((s) => s.activeStoppage);

  if (!item) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-6">
        <StatusPill status="idle" />
        <div className="my-auto text-center">
          <p className="text-2xl font-bold text-muted-foreground">No active job</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start setup on the next job to begin.
          </p>
        </div>
      </div>
    );
  }

  const status =
    lineStatus === "stopped"
      ? "stopped"
      : item.actual_status === "setup_in_progress"
        ? "setup"
        : "running";

  const planned = new Date(item.planned_end).getTime() - new Date(item.planned_start).getTime();
  const elapsed = item.actual_start ? Date.now() - new Date(item.actual_start).getTime() : 0;
  const pct = item.progress_pct ?? Math.min(99, Math.round((elapsed / planned) * 100));

  const fmtTime = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "—";

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <StatusPill status={status} />
        {stoppage && (
          <ElapsedTimer
            start={stoppage.started_at}
            prefix="Stopped for "
            className="font-mono text-sm font-bold text-status-stopped"
          />
        )}
      </div>

      <div className="mt-5">
        <p className="font-mono text-lg text-muted-foreground">{item.wo_id}</p>
        <h2 className="mt-1 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {item.grade}
        </h2>
        <p className="mt-2 text-xl font-semibold text-muted-foreground">
          {item.gauge_mm.toFixed(2)} × {item.width_mm} mm
        </p>
        <p className="text-base text-muted-foreground">
          {item.qty_planned_mt.toFixed(2)} MT planned
        </p>
      </div>

      {item.coil_id && (
        <button
          onClick={onCoilTap}
          className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-left transition-colors hover:bg-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Coil mounted
            </p>
            <p className="font-mono text-base font-bold text-foreground">
              {item.coil_id}
            </p>
          </div>
          {item.actual_start && (
            <span className="ml-auto text-xs text-muted-foreground">
              Mounted {fmtTime(item.actual_start)}
            </span>
          )}
        </button>
      )}

      <div className="my-5 border-t border-border" />

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Started</p>
          <p className="mt-1 font-mono text-base font-bold text-foreground">
            {fmtTime(item.actual_start)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Planned end</p>
          <p className="mt-1 font-mono text-base font-bold text-foreground">
            {fmtTime(item.planned_end)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Elapsed</p>
          {item.actual_start ? (
            <ElapsedTimer
              start={item.actual_start}
              className="mt-1 block font-mono text-base font-bold text-foreground"
            />
          ) : (
            <p className="mt-1 font-mono text-base font-bold text-foreground">—</p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-5">
        <ProgressBar pct={pct} plannedDurationMs={planned} elapsedMs={elapsed} />
      </div>
    </div>
  );
}
