import { useState } from "react";
import { FullScreenOverlay } from "@/components/shared/FullScreenOverlay";
import { selectNextItem, useFloorConsole } from "@/store/floorConsoleStore";
import { simulateCoilScan } from "@/mocks/data";
import type { CoilScanResult } from "@/types";
import { ScanLine, AlertOctagon, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

type Stage = "scan" | "success" | "error";

export function CoilScanScreen({ onClose }: Props) {
  const next = useFloorConsole(selectNextItem);
  const [input, setInput] = useState("HR_");
  const [result, setResult] = useState<CoilScanResult | null>(null);
  const [stage, setStage] = useState<Stage>("scan");
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);

  const scan = () => {
    if (!input.trim()) return;
    const r = simulateCoilScan(input.trim().toUpperCase());
    setResult(r);
    setStage(r.success ? "success" : "error");
  };

  const allChecked = checks.every(Boolean);

  return (
    <FullScreenOverlay
      title="Coil scan"
      subtitle={
        next
          ? `${"CRS-2"} · Active WO: ${next.wo_id}`
          : "No upcoming job"
      }
      onClose={onClose}
      tone={stage === "error" ? "danger" : stage === "success" ? "success" : "default"}
    >
      {stage === "scan" && (
        <div className="mx-auto max-w-xl p-6">
          {next && (
            <div className="mb-6 rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Expected spec
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {next.grade} · {next.gauge_mm} × {next.width_mm} mm
              </p>
              {next.coil_id && (
                <p className="mt-2 font-mono text-sm text-muted-foreground">
                  Coil reserved: <span className="font-bold text-foreground">{next.coil_id}</span>
                </p>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scan barcode or enter coil ID
            </span>
            <div className="relative mt-2">
              <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-accent" />
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && scan()}
                placeholder="HR_***"
                className="h-20 w-full rounded-2xl border-2 border-input bg-background pl-14 pr-4 font-mono text-2xl font-bold outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </label>

          <button
            onClick={scan}
            disabled={!input.trim()}
            className="mt-5 h-20 w-full rounded-2xl bg-accent text-base font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent/90 disabled:opacity-40"
          >
            Scan
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Try: <code className="font-mono">HR_298452</code> (success),{" "}
            <code className="font-mono">HR_298999</code> (mismatch),{" "}
            <code className="font-mono">HR_298111</code> (already consumed)
          </p>
        </div>
      )}

      {stage === "success" && result && (
        <div className="absolute inset-0 top-[72px] flex flex-col bg-status-running text-status-running-foreground">
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 className="h-20 w-20" strokeWidth={2.5} />
            </div>
            <h2 className="mt-6 text-3xl font-bold uppercase tracking-wider">
              Coil confirmed
            </h2>
            <p className="mt-3 font-mono text-xl">
              {result.coil_id} · {result.grade}
            </p>
            <p className="text-base opacity-80">
              {result.weight_mt?.toFixed(2)} MT · {result.gauge_mm} × {result.width_mm} mm
            </p>

            <div className="mt-8 w-full max-w-md rounded-2xl bg-white/10 p-5">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                Mount confirmation checklist
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  "Coil ID visually confirmed",
                  "Mounted on top mandrel",
                  "Threading complete",
                ].map((label, idx) => (
                  <li key={label}>
                    <button
                      onClick={() =>
                        setChecks((prev) =>
                          prev.map((v, i) => (i === idx ? !v : v)),
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl bg-white/10 p-3 text-left transition-colors hover:bg-white/20"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-md border-2 border-white/60 text-sm font-bold ${
                          checks[idx] ? "bg-white text-status-running" : ""
                        }`}
                      >
                        {checks[idx] ? "✓" : ""}
                      </span>
                      <span className="text-base font-semibold">{label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="p-6">
            <button
              disabled={!allChecked}
              onClick={() => {
                toast.success("Coil mount confirmed");
                onClose();
              }}
              className="h-[88px] w-full rounded-2xl bg-white text-base font-bold uppercase tracking-wider text-status-running transition-all hover:bg-white/90 disabled:opacity-40"
            >
              Confirm mount
            </button>
          </div>
        </div>
      )}

      {stage === "error" && result && (
        <div className="absolute inset-0 top-[72px] flex flex-col bg-status-reject text-status-reject-foreground">
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <AlertOctagon className="h-32 w-32" strokeWidth={2.5} />
            <h2 className="mt-4 text-3xl font-bold uppercase tracking-wider">
              {result.error === "ALREADY_CONSUMED"
                ? "Coil already consumed — STOP"
                : "Coil mismatch — STOP"}
            </h2>
            <div className="mt-6 space-y-2 text-lg">
              <p>
                You scanned: <span className="font-mono font-bold">{result.coil_id}</span>
              </p>
              {result.grade && (
                <p>
                  Grade found: <span className="font-mono font-bold">{result.grade}</span>
                </p>
              )}
              {next && (
                <p>
                  Active job needs: <span className="font-mono font-bold">{next.grade}</span>
                </p>
              )}
              <p className="mt-4 text-xl font-bold">{result.error_detail}</p>
              <p className="mt-2 text-2xl font-bold uppercase tracking-wider">
                Do not mount this coil.
              </p>
            </div>
          </div>
          <div className="space-y-3 p-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setStage("scan");
                  setInput("HR_");
                  setResult(null);
                }}
                className="h-[88px] rounded-2xl bg-white text-base font-bold uppercase tracking-wider text-status-reject"
              >
                Scan again
              </button>
              <button
                onClick={() => toast("Calling supervisor...", { icon: "📞" })}
                className="flex h-[88px] items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 text-base font-bold uppercase tracking-wider"
              >
                <Phone className="h-5 w-5" /> Call supervisor
              </button>
            </div>
            <button className="w-full text-xs font-semibold uppercase tracking-wider text-white/60 underline-offset-4 hover:underline">
              Override (PIN required)
            </button>
          </div>
        </div>
      )}
    </FullScreenOverlay>
  );
}
