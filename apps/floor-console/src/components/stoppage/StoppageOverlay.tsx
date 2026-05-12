import { useState } from "react";
import { FullScreenOverlay } from "@/components/shared/FullScreenOverlay";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

// v0.2: Catalogue-driven stoppage codes (Hero Steels 16 codes in 7 buckets)
// In production these come from master.stoppage_codes via API
const STOPPAGE_CODES = [
  { code: "01", display_name: "Mechanical", bucket: "Equipment Failure", is_planned: false },
  { code: "02", display_name: "Electrical", bucket: "Equipment Failure", is_planned: false },
  { code: "11", display_name: "Power Failure", bucket: "Equipment Failure", is_planned: false },
  { code: "14", display_name: "Hydraulic", bucket: "Equipment Failure", is_planned: false },
  { code: "04", display_name: "Work Roll Change", bucket: "Tool Change", is_planned: true },
  { code: "06", display_name: "B.U. Roll Change", bucket: "Tool Change", is_planned: true },
  { code: "07", display_name: "Raw Material", bucket: "Material / Supply", is_planned: false },
  { code: "15", display_name: "Mtl. short due to crane B.D.", bucket: "Material / Supply", is_planned: false },
  { code: "03", display_name: "Crane", bucket: "Utility / Support", is_planned: false },
  { code: "05", display_name: "H.V./L.V.", bucket: "Utility / Support", is_planned: false },
  { code: "08", display_name: "Services", bucket: "Utility / Support", is_planned: false },
  { code: "10", display_name: "Short of Man", bucket: "Human", is_planned: false },
  { code: "12", display_name: "Operational", bucket: "Human", is_planned: false },
  { code: "13", display_name: "No Planning", bucket: "Planning", is_planned: false },
  { code: "09", display_name: "Preventive Maint.", bucket: "Planned", is_planned: true },
  { code: "16", display_name: "Setting Adjustment", bucket: "Planned", is_planned: true },
] as const;

const BUCKET_ORDER = [
  "Equipment Failure",
  "Tool Change",
  "Material / Supply",
  "Utility / Support",
  "Human",
  "Planning",
  "Planned",
] as const;

const BUCKET_COLORS: Record<string, string> = {
  "Equipment Failure": "border-status-reject/40 bg-status-reject/5",
  "Tool Change": "border-status-setup/40 bg-status-setup/5",
  "Material / Supply": "border-status-stopped/40 bg-status-stopped/5",
  "Utility / Support": "border-info/40 bg-info/5",
  "Human": "border-purple/40 bg-purple/5",
  "Planning": "border-warning/40 bg-warning/5",
  "Planned": "border-success/40 bg-success/5",
};

type Step = "category" | "detail";

export function StoppageOverlay({ onClose }: Props) {
  const startStoppage = useFloorConsole((s) => s.startStoppage);
  const [step, setStep] = useState<Step>("category");
  const [selectedCode, setSelectedCode] = useState<(typeof STOPPAGE_CODES)[number] | null>(null);
  const [notes, setNotes] = useState("");

  const startedAt = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const pickCode = (code: (typeof STOPPAGE_CODES)[number]) => {
    setSelectedCode(code);
    setStep("detail");
  };

  const confirm = () => {
    if (!selectedCode) return;
    startStoppage(selectedCode.code, undefined, notes || undefined);
    toast.success("Stoppage logged", {
      description: `${selectedCode.code} · ${selectedCode.display_name}`,
    });
    onClose();
  };

  // Group codes by bucket
  const byBucket = BUCKET_ORDER.map((bucket) => ({
    bucket,
    codes: STOPPAGE_CODES.filter((c) => c.bucket === bucket),
  })).filter((g) => g.codes.length > 0);

  return (
    <FullScreenOverlay
      title="Select stoppage reason"
      subtitle={`Line stopped at ${startedAt}`}
      onClose={onClose}
    >
      {step === "category" && (
        <div className="overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {byBucket.map(({ bucket, codes }) => (
              <div key={bucket}>
                <p
                  className={cn(
                    "mb-2 inline-block rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider",
                    BUCKET_COLORS[bucket] ?? "border-border bg-muted",
                  )}
                >
                  {bucket}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {codes.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => pickCode(c)}
                      className={cn(
                        "flex min-h-[80px] flex-col items-start justify-between rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                        c.is_planned
                          ? "border-success/30 bg-success/5 hover:border-success"
                          : "border-border bg-card hover:border-accent",
                      )}
                    >
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {c.code}
                      </span>
                      <span className="mt-1 text-sm font-bold leading-tight text-foreground">
                        {c.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "detail" && selectedCode && (
        <div className="mx-auto max-w-2xl p-6">
          <button
            onClick={() => setStep("category")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="mb-6 flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-muted-foreground">
              {selectedCode.code}
            </span>
            <h3 className="text-2xl font-bold uppercase tracking-wider">
              {selectedCode.display_name}
            </h3>
            <span
              className={cn(
                "ml-auto rounded-full border px-3 py-0.5 text-xs font-bold uppercase",
                BUCKET_COLORS[selectedCode.bucket] ?? "border-border bg-muted",
              )}
            >
              {selectedCode.bucket}
            </span>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Add detail (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Bearing noise started at 10:45..."
              className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-4 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <button
            onClick={confirm}
            className="mt-6 h-[88px] w-full rounded-2xl bg-status-stopped text-base font-bold uppercase tracking-wider text-status-stopped-foreground transition-all hover:bg-status-stopped/90 active:scale-[0.99]"
          >
            Confirm stoppage
          </button>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Stoppage started {startedAt}. Reason will be saved.
          </p>
        </div>
      )}
    </FullScreenOverlay>
  );
}
