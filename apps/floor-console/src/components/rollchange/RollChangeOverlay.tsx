import { useState } from "react";
import { FullScreenOverlay } from "@/components/shared/FullScreenOverlay";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { ScanLine, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

const ROLL_CHANGE_REASONS = [
  { id: "scheduled_grind", label: "Scheduled Grind" },
  { id: "wear_threshold", label: "Wear Threshold" },
  { id: "breakage", label: "Breakage" },
  { id: "grade_change", label: "Grade Change" },
  { id: "quality_issue", label: "Quality Issue" },
] as const;

type RollFinish = "M" | "B";

export function RollChangeOverlay({ onClose }: Props) {
  const device = useFloorConsole((s) => s.device);

  // Outgoing rolls (pre-populated from device context in real impl)
  const [outTopId] = useState("R-CRS2-TR-047");
  const [outBottomId] = useState("R-CRS2-BR-023");
  const [outTonnage] = useState(8420.3);

  // Incoming rolls
  const [inTopId, setInTopId] = useState("");
  const [inBottomId, setInBottomId] = useState("");
  const [inRollFinish, setInRollFinish] = useState<RollFinish | "">("");

  const [reason, setReason] = useState<string>("");
  const [craneOperator, setCraneOperator] = useState("");
  const [notes, setNotes] = useState("");

  const valid = inTopId.trim() && inBottomId.trim() && reason && inRollFinish;

  const submit = () => {
    if (!valid) return;
    toast.success("Roll change recorded", {
      description: `In: ${inTopId} / ${inBottomId} · Finish: ${inRollFinish}`,
    });
    onClose();
  };

  return (
    <FullScreenOverlay
      title="Roll Change"
      subtitle={`${device.wc_id} · Shift ${device.shift}`}
      onClose={onClose}
    >
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Outgoing rolls (read-only) */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Rolls going out
          </p>
          <div className="grid grid-cols-2 gap-3">
            <RollCard label="Top" rollId={outTopId} tonnage={outTonnage} />
            <RollCard label="Bottom" rollId={outBottomId} tonnage={outTonnage - 40} />
          </div>
        </section>

        {/* Incoming rolls */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Rolls coming in
          </p>
          <div className="space-y-3">
            <ScanInput
              label="Top roll ID"
              value={inTopId}
              onChange={setInTopId}
              placeholder="Scan or enter roll ID"
            />
            <ScanInput
              label="Bottom roll ID"
              value={inBottomId}
              onChange={setInBottomId}
              placeholder="Scan or enter roll ID"
            />
          </div>

          <div className="mt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Roll finish (M = Mill · B = Burnish)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["M", "B"] as RollFinish[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setInRollFinish(f)}
                  className={cn(
                    "h-14 rounded-2xl border-2 text-lg font-bold uppercase tracking-wider transition-all",
                    inRollFinish === f
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-foreground hover:border-accent/60",
                  )}
                >
                  {f} — {f === "M" ? "Mill" : "Burnish"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Reason */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Reason
          </p>
          <div className="relative">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-14 w-full appearance-none rounded-2xl border border-input bg-background px-4 pr-10 text-base font-semibold outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select reason…</option>
              {ROLL_CHANGE_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </section>

        {/* Crane operator */}
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Crane operator (optional)
          </span>
          <input
            value={craneOperator}
            onChange={(e) => setCraneOperator(e.target.value)}
            placeholder="Operator ID or name"
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

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

        <button
          onClick={submit}
          disabled={!valid}
          className="h-[88px] w-full rounded-2xl bg-accent text-base font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent/90 active:scale-[0.99] disabled:opacity-40"
        >
          Confirm Roll Change
        </button>
      </div>
    </FullScreenOverlay>
  );
}

function RollCard({
  label,
  rollId,
  tonnage,
}: {
  label: string;
  rollId: string;
  tonnage: number;
}) {
  const lifePct = Math.min(100, (tonnage / 10000) * 100);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-base font-bold">{rollId}</p>
      <p className="mt-1 text-sm text-muted-foreground">{tonnage.toLocaleString()} MT rolled</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            lifePct > 80 ? "bg-status-stopped" : lifePct > 60 ? "bg-status-setup" : "bg-status-running",
          )}
          style={{ width: `${lifePct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{lifePct.toFixed(0)}% of expected life</p>
    </div>
  );
}

function ScanInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="relative">
        <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
          className="h-14 w-full rounded-2xl border-2 border-input bg-background pl-12 pr-4 font-mono text-base font-bold outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
