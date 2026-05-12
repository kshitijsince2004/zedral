import { useMemo, useState } from "react";
import { FullScreenOverlay } from "@/components/shared/FullScreenOverlay";
import { NumberInput } from "@/components/shared/NumberInput";
import { useFloorConsole, selectActiveItem } from "@/store/floorConsoleStore";
import { Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  onClose: () => void;
}

interface CoilEntry {
  id: string;
  weight: number;
}

export function CompleteJobOverlay({ onClose }: Props) {
  const item = useFloorConsole(selectActiveItem);
  const completeJob = useFloorConsole((s) => s.completeJob);
  const [actual, setActual] = useState(item?.qty_planned_mt ?? 0);
  const [scrap, setScrap] = useState(0);
  const [notes, setNotes] = useState("");
  const [coils, setCoils] = useState<CoilEntry[]>(
    item?.coil_id ? [{ id: item.coil_id, weight: (item.qty_planned_mt ?? 0) + 0.15 }] : [],
  );
  const [newCoil, setNewCoil] = useState("");
  const [flash, setFlash] = useState(false);

  const planned = item?.qty_planned_mt ?? 0;
  const lowVariance = useMemo(() => actual > 0 && actual < planned * 0.85, [actual, planned]);
  const highScrap = useMemo(() => scrap > planned * 0.05, [scrap, planned]);

  if (!item) {
    return (
      <FullScreenOverlay title="Complete Job" onClose={onClose}>
        <div className="p-10 text-center text-muted-foreground">No active job to complete.</div>
      </FullScreenOverlay>
    );
  }

  const submit = () => {
    if (actual <= 0) return;
    setFlash(true);
    completeJob(item.item_id, actual, scrap, notes);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <FullScreenOverlay
      title="Complete job"
      subtitle={`${item.wo_id} · ${item.grade}`}
      onClose={onClose}
    >
      {flash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-status-running/95 text-status-running-foreground"
        >
          <div className="text-center">
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-white/20 text-7xl">
              ✓
            </div>
            <p className="mt-6 text-3xl font-bold uppercase tracking-wider">
              Job complete
            </p>
          </div>
        </motion.div>
      )}

      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Planned qty
            </p>
            <div className="flex h-16 items-center rounded-xl border border-border bg-muted px-4 font-mono text-2xl font-bold tabular-nums text-muted-foreground">
              {planned.toFixed(2)} <span className="ml-2 text-sm">MT</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Actual qty
            </p>
            <NumberInput value={actual} onChange={setActual} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scrap / Reject
            </p>
            <NumberInput value={scrap} onChange={setScrap} />
          </div>
        </div>

        {(lowVariance || highScrap) && (
          <div className="space-y-2">
            {lowVariance && (
              <div className="flex items-start gap-3 rounded-xl border border-status-stopped/40 bg-status-stopped/10 p-4 text-sm font-semibold text-status-stopped">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Actual is significantly below plan — is this correct?
              </div>
            )}
            {highScrap && (
              <div className="flex items-start gap-3 rounded-xl border border-status-reject/40 bg-status-reject/10 p-4 text-sm font-semibold text-status-reject">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Scrap exceeds 5% of planned qty
              </div>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Coils consumed
          </p>
          <div className="rounded-2xl border border-border bg-card p-4">
            <ul className="divide-y divide-border">
              {coils.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <span className="font-mono text-base font-bold text-foreground">{c.id}</span>
                  <span className="text-sm text-muted-foreground">
                    · {c.weight.toFixed(2)} MT input
                  </span>
                  <button
                    onClick={() => setCoils((prev) => prev.filter((p) => p.id !== c.id))}
                    className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-status-reject hover:bg-status-reject/10"
                  >
                    <X className="h-4 w-4" /> Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                value={newCoil}
                onChange={(e) => setNewCoil(e.target.value.toUpperCase())}
                placeholder="Add coil ID (e.g. HR_298500)"
                className="h-12 flex-1 rounded-xl border border-input bg-background px-4 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => {
                  if (!newCoil.trim()) return;
                  setCoils((prev) => [...prev, { id: newCoil.trim(), weight: 0 }]);
                  setNewCoil("");
                }}
                className="inline-flex h-12 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>

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
          disabled={actual <= 0}
          className="flex h-[88px] w-full items-center justify-center gap-3 rounded-2xl bg-status-running text-base font-bold uppercase tracking-wider text-status-running-foreground transition-all hover:bg-status-running/90 active:scale-[0.99] disabled:opacity-40"
        >
          ✓ Confirm job complete
        </button>

        {(() => {
          toast; // keep import
          return null;
        })()}
      </div>
    </FullScreenOverlay>
  );
}
