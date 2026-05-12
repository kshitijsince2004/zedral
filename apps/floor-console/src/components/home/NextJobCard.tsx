import { useFloorConsole, selectNextItem, selectActiveItem } from "@/store/floorConsoleStore";
import { MaterialBadge } from "@/components/shared/MaterialBadge";
import { Wrench } from "lucide-react";

interface Props {
  onStartSetup: () => void;
}

export function NextJobCard({ onStartSetup }: Props) {
  const next = useFloorConsole(selectNextItem);
  const active = useFloorConsole(selectActiveItem);
  const lineStatus = useFloorConsole((s) => s.lineStatus);

  if (!next) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-dashed border-border bg-card/50 p-6">
        <span className="inline-flex w-fit rounded-full border border-border bg-background px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Next up
        </span>
        <div className="my-auto text-center text-muted-foreground">
          <p className="text-base">No more pending jobs in this shift.</p>
        </div>
      </div>
    );
  }

  const setupDisabled =
    lineStatus === "setup_in_progress" ||
    (active && active.actual_status === "production_in_progress" && lineStatus !== "stopped");

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm">
      <span className="inline-flex w-fit rounded-full border border-status-setup/30 bg-status-setup/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-status-setup">
        Next up
      </span>

      <div className="mt-5">
        <p className="font-mono text-base text-muted-foreground">{next.wo_id}</p>
        <h3 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
          {next.grade}
        </h3>
        <p className="mt-1 text-lg text-muted-foreground">
          {next.gauge_mm.toFixed(2)} × {next.width_mm} mm
        </p>
        <p className="text-sm text-muted-foreground">
          {next.qty_planned_mt.toFixed(2)} MT
        </p>
      </div>

      {next.coil_id && (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-sm text-muted-foreground">
            Coil: <span className="font-bold text-foreground">{next.coil_id}</span>
          </p>
          <MaterialBadge location={next.coil_location ?? null} />
        </div>
      )}

      {next.setup_minutes_planned > 0 && (
        <div className="mt-4 rounded-xl border border-status-stopped/30 bg-status-stopped/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-status-stopped">
            ⚙ Setup required
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {next.setup_minutes_planned} min planned
            {next.changeover_reason && (
              <span className="text-muted-foreground"> · {next.changeover_reason.replace(/_/g, " ")}</span>
            )}
          </p>
        </div>
      )}

      <div className="mt-auto pt-5">
        <button
          onClick={onStartSetup}
          disabled={!!setupDisabled}
          className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-status-setup font-bold uppercase tracking-wider text-status-setup-foreground transition-all hover:bg-status-setup/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wrench className="h-6 w-6" /> Start Setup
        </button>
        {setupDisabled && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Complete current job before starting setup
          </p>
        )}
      </div>
    </div>
  );
}
