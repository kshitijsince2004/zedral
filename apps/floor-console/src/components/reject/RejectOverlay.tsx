import { useState } from "react";
import { FullScreenOverlay } from "@/components/shared/FullScreenOverlay";
import { NumberInput } from "@/components/shared/NumberInput";
import { useFloorConsole, selectActiveItem } from "@/store/floorConsoleStore";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

// Catalogue-driven defect codes grouped by family
// In production these come from master.defect_codes via API
const DEFECT_CODES = [
  // Dimensional
  { code: "D01", display_name: "Gauge over-tolerance", family: "Dimensional", default_disposition: "Rework" },
  { code: "D02", display_name: "Width deviation", family: "Dimensional", default_disposition: "Rework" },
  { code: "D03", display_name: "Camber / bow", family: "Dimensional", default_disposition: "Rework" },
  { code: "D04", display_name: "Edge wave", family: "Dimensional", default_disposition: "Rework" },
  // Surface
  { code: "S01", display_name: "Roll mark", family: "Surface", default_disposition: "Downgrade" },
  { code: "S02", display_name: "Scratch / gouge", family: "Surface", default_disposition: "Downgrade" },
  { code: "S03", display_name: "Rust / stain", family: "Surface", default_disposition: "Downgrade" },
  { code: "S04", display_name: "Oil contamination", family: "Surface", default_disposition: "Rework" },
  { code: "S05", display_name: "Pitting", family: "Surface", default_disposition: "Scrap" },
  // Mechanical
  { code: "M01", display_name: "Coil break / crack", family: "Mechanical", default_disposition: "Scrap" },
  { code: "M02", display_name: "Lamination", family: "Mechanical", default_disposition: "Scrap" },
  { code: "M03", display_name: "Inclusion", family: "Mechanical", default_disposition: "Pending review" },
  // Process
  { code: "P01", display_name: "Flatness / shape", family: "Process", default_disposition: "Rework" },
  { code: "P02", display_name: "Tension mark", family: "Process", default_disposition: "Downgrade" },
  { code: "P03", display_name: "Coil set", family: "Process", default_disposition: "Rework" },
  // Grade / Chemistry
  { code: "G01", display_name: "Wrong grade rolled", family: "Grade", default_disposition: "Scrap" },
  { code: "G02", display_name: "Hardness out of spec", family: "Grade", default_disposition: "Pending review" },
] as const;

const FAMILY_ORDER = ["Dimensional", "Surface", "Mechanical", "Process", "Grade"] as const;

const FAMILY_COLORS: Record<string, string> = {
  Dimensional: "border-info/40 bg-info/5",
  Surface: "border-status-setup/40 bg-status-setup/5",
  Mechanical: "border-status-reject/40 bg-status-reject/5",
  Process: "border-warning/40 bg-warning/5",
  Grade: "border-purple/40 bg-purple/5",
};

const DISPOSITIONS = ["Rework", "Downgrade", "Scrap", "Pending review"] as const;

type Step = "family" | "detail";

export function RejectOverlay({ onClose }: Props) {
  const item = useFloorConsole(selectActiveItem);
  const raise = useFloorConsole((s) => s.raiseReject);

  const [step, setStep] = useState<Step>("family");
  const [selectedCode, setSelectedCode] = useState<(typeof DEFECT_CODES)[number] | null>(null);
  const [qty, setQty] = useState(0);
  const [disposition, setDisposition] = useState<string>("");
  const [notes, setNotes] = useState("");

  const valid = qty > 0 && selectedCode && disposition && notes.trim().length >= 10;

  const pickCode = (code: (typeof DEFECT_CODES)[number]) => {
    setSelectedCode(code);
    setDisposition(code.default_disposition);
    setStep("detail");
  };

  const submit = () => {
    if (!valid || !item) return;
    raise(item.wo_id, qty, selectedCode!.code, disposition, notes);
    toast.success("Reject raised", { description: "Quality team notified" });
    onClose();
  };

  const byFamily = FAMILY_ORDER.map((family) => ({
    family,
    codes: DEFECT_CODES.filter((c) => c.family === family),
  }));

  return (
    <FullScreenOverlay
      title="Raise reject"
      subtitle={item ? `${item.wo_id} · ${item.grade}` : undefined}
      onClose={onClose}
      tone="danger"
    >
      {step === "family" && (
        <div className="overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {byFamily.map(({ family, codes }) => (
              <div key={family}>
                <p
                  className={cn(
                    "mb-2 inline-block rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider",
                    FAMILY_COLORS[family] ?? "border-border bg-muted",
                  )}
                >
                  {family}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {codes.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => pickCode(c)}
                      className="flex min-h-[72px] flex-col items-start justify-between rounded-2xl border-2 border-border bg-card p-4 text-left transition-all hover:border-status-reject hover:scale-[1.02] active:scale-[0.98]"
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
        <div className="mx-auto max-w-2xl space-y-6 p-6">
          <button
            onClick={() => setStep("family")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="font-mono text-xl font-bold text-muted-foreground">
              {selectedCode.code}
            </span>
            <div>
              <p className="font-bold">{selectedCode.display_name}</p>
              <p className="text-sm text-muted-foreground">{selectedCode.family}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reject qty (MT)
            </p>
            <NumberInput value={qty} onChange={setQty} />
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Disposition
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DISPOSITIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDisposition(d)}
                  className={cn(
                    "h-12 rounded-full border-2 px-4 text-sm font-bold uppercase tracking-wider transition-all",
                    disposition === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-accent",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notes (required, min 10 chars)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <span
              className={cn(
                "mt-1 block text-xs",
                notes.trim().length >= 10 ? "text-status-running" : "text-muted-foreground",
              )}
            >
              {notes.trim().length}/10
            </span>
          </label>

          <button
            onClick={submit}
            disabled={!valid}
            className="h-[88px] w-full rounded-2xl bg-status-reject text-base font-bold uppercase tracking-wider text-status-reject-foreground transition-all hover:bg-status-reject/90 active:scale-[0.99] disabled:opacity-40"
          >
            Submit reject
          </button>
        </div>
      )}
    </FullScreenOverlay>
  );
}
