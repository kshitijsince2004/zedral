import { useState } from "react";
import { FullScreenOverlay } from "@/components/shared/FullScreenOverlay";
import { NumberInput } from "@/components/shared/NumberInput";
import { useFloorConsole, selectActiveItem } from "@/store/floorConsoleStore";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProductionPass } from "@zedral/shared-types";

interface Props {
  passNumber: number;
  totalPasses: number;
  thicknessIn: number | null;
  onPassComplete: (pass: Omit<ProductionPass, "pass_id" | "dispatch_item_id" | "operator_id">) => void;
  onClose: () => void;
}

export function PassCaptureOverlay({
  passNumber,
  totalPasses,
  thicknessIn,
  onPassComplete,
  onClose,
}: Props) {
  const item = useFloorConsole(selectActiveItem);
  const [thicknessOut, setThicknessOut] = useState<number>(0);
  const [rwTension, setRwTension] = useState<number>(0);
  const [coolantTemp, setCoolantTemp] = useState<number>(0);
  const [coolantPress, setCoolantPress] = useState<number>(0);
  const [isFinal, setIsFinal] = useState(passNumber >= totalPasses);
  const [notes, setNotes] = useState("");

  const reductionPct =
    thicknessIn && thicknessIn > 0 && thicknessOut > 0
      ? ((thicknessIn - thicknessOut) / thicknessIn) * 100
      : null;

  const noReduction = thicknessOut > 0 && thicknessIn != null && thicknessOut >= thicknessIn;
  const highReduction = reductionPct != null && reductionPct > 40;

  const valid = thicknessOut > 0 && !noReduction;

  const confirm = () => {
    if (!valid) return;
    onPassComplete({
      pass_number: passNumber,
      is_final: isFinal,
      thickness_in_mm: thicknessIn,
      thickness_out_mm: thicknessOut,
      reduction_pct: reductionPct,
      rw_tension: rwTension || null,
      coolant_temp_c: coolantTemp || null,
      coolant_press_kg_cm2: coolantPress || null,
      started_at: null,
      ended_at: new Date().toISOString(),
      duration_sec: null,
      notes: notes || null,
    });
    toast.success(isFinal ? "Final pass complete" : `Pass ${passNumber} complete`);
    onClose();
  };

  return (
    <FullScreenOverlay
      title={`Pass ${passNumber} of ${totalPasses}`}
      subtitle={item ? `${item.wo_id} · ${item.grade}` : undefined}
      onClose={onClose}
    >
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Thickness row */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex-1 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">In</p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums">
              {thicknessIn != null ? thicknessIn.toFixed(3) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">mm</p>
          </div>
          <div className="text-2xl text-muted-foreground">→</div>
          <div className="flex-1 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Out</p>
            <NumberInput value={thicknessOut} onChange={setThicknessOut} step={0.001} decimals={3} />
            <p className="mt-1 text-xs text-muted-foreground">mm · tap to edit</p>
          </div>
          {reductionPct != null && (
            <div className="flex-1 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reduction
              </p>
              <p
                className={cn(
                  "mt-1 font-mono text-3xl font-bold tabular-nums",
                  highReduction ? "text-status-stopped" : "text-status-running",
                )}
              >
                {reductionPct.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {noReduction && (
          <div className="flex items-center gap-3 rounded-xl border border-status-stopped/40 bg-status-stopped/10 p-4 text-sm font-semibold text-status-stopped">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            No reduction recorded — thickness-out must be less than thickness-in. Confirm?
          </div>
        )}
        {highReduction && (
          <div className="flex items-center gap-3 rounded-xl border border-status-stopped/40 bg-status-stopped/10 p-4 text-sm font-semibold text-status-stopped">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Reduction &gt;40% — typical max is 30–35%. Check measurement.
          </div>
        )}

        {/* Process parameters */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              R/W Tension (kN)
            </p>
            <NumberInput value={rwTension} onChange={setRwTension} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Coolant Temp (°C)
            </p>
            <NumberInput value={coolantTemp} onChange={setCoolantTemp} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Coolant Press (kg/cm²)
            </p>
            <NumberInput value={coolantPress} onChange={setCoolantPress} step={0.1} decimals={1} />
          </div>
        </div>

        {/* Final pass toggle */}
        <button
          type="button"
          onClick={() => setIsFinal((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
            isFinal
              ? "border-status-running bg-status-running/10 text-status-running"
              : "border-border bg-card text-foreground",
          )}
        >
          <CheckCircle2 className={cn("h-6 w-6 shrink-0", isFinal ? "text-status-running" : "text-muted-foreground")} />
          <div>
            <p className="font-bold">This is the final pass</p>
            <p className="text-sm opacity-70">
              {isFinal
                ? "Will trigger production completion flow"
                : "More passes to follow after this"}
            </p>
          </div>
        </button>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Notes (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="h-[72px] rounded-2xl border-2 border-border text-sm font-bold uppercase tracking-wider text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!valid}
            className="h-[72px] rounded-2xl bg-accent text-sm font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent/90 disabled:opacity-40"
          >
            Confirm Pass {passNumber}
          </button>
        </div>
      </div>
    </FullScreenOverlay>
  );
}
