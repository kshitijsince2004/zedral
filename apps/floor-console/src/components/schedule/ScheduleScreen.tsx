import { useState } from "react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import type { DispatchItem } from "@/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText } from "lucide-react";

const statusMeta: Record<DispatchItem["actual_status"], { label: string; cls: string; icon: string }> = {
  complete: { label: "Done", cls: "border-l-status-running text-muted-foreground", icon: "✓" },
  production_in_progress: { label: "Running", cls: "border-l-status-running bg-status-running/5", icon: "▶" },
  setup_in_progress: { label: "Setup", cls: "border-l-status-setup bg-status-setup/5", icon: "⚙" },
  pending: { label: "Queued", cls: "border-l-border", icon: "·" },
  tentative: { label: "Tentative", cls: "border-l-border italic opacity-70", icon: "·" },
};

export function ScheduleScreen() {
  const dispatch = useFloorConsole((s) => s.dispatch);
  const device = useFloorConsole((s) => s.device);
  const [selected, setSelected] = useState<DispatchItem | null>(null);

  const totalMt = dispatch.reduce((s, i) => s + i.qty_planned_mt, 0);
  const start = new Date(device.shift_start);
  const end = new Date(device.shift_end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  const completed = dispatch.filter((i) => i.actual_status === "complete").length;
  const next = dispatch.find((i) => i.actual_status === "pending");

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {device.wc_id} · Shift {device.shift} · {fmt(start)}–{fmt(end)}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>Jobs: <strong className="text-foreground">{dispatch.length}</strong></span>
          <span>Completed: <strong className="text-foreground">{completed}</strong></span>
          <span>Target: <strong className="text-foreground">{totalMt.toFixed(1)} MT</strong></span>
          {next && <span>Next: <strong className="text-foreground">{next.wo_id}</strong></span>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {dispatch.map((item) => {
            const m = statusMeta[item.actual_status];
            return (
              <button
                key={item.item_id}
                onClick={() => setSelected(item)}
                className={cn(
                  "flex min-h-[80px] w-full items-center gap-4 rounded-2xl border-l-4 border border-border bg-card px-4 py-3 text-left transition-all hover:shadow-md",
                  m.cls,
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-xl font-bold">
                  {item.sequence_in_shift}
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">WO</p>
                    <p className="font-mono text-sm font-bold text-foreground">{item.wo_id}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Grade</p>
                    <p className="text-sm font-bold text-foreground">{item.grade}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Gauge × Width
                    </p>
                    <p className="font-mono text-sm text-foreground">
                      {item.gauge_mm} × {item.width_mm}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Qty</p>
                    <p className="font-mono text-sm font-bold text-foreground">
                      {item.qty_planned_mt.toFixed(1)} MT
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                    item.actual_status === "complete" && "bg-status-running/10 text-status-running",
                    item.actual_status === "production_in_progress" && "bg-status-running/15 text-status-running",
                    item.actual_status === "setup_in_progress" && "bg-status-setup/15 text-status-setup",
                    item.actual_status === "pending" && "bg-muted text-muted-foreground",
                    item.actual_status === "tentative" && "bg-status-stopped/15 text-status-stopped",
                  )}>
                    <span>{m.icon}</span> {m.label}
                  </span>
                  {item.setup_minutes_planned > 0 && (
                    <span className="text-xs font-semibold text-status-stopped">
                      Setup {item.setup_minutes_planned}m
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-t-3xl bg-card p-6 sm:rounded-3xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">{selected.wo_id}</p>
                  <h3 className="mt-1 text-3xl font-bold tracking-tight">{selected.grade}</h3>
                  <p className="text-base text-muted-foreground">
                    {selected.gauge_mm} × {selected.width_mm} mm · {selected.qty_planned_mt} MT
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <Field label="Planned start" value={fmt(new Date(selected.planned_start))} />
                <Field label="Planned end" value={fmt(new Date(selected.planned_end))} />
                <Field label="Coil" value={selected.coil_id ?? "—"} mono />
                <Field
                  label="Setup"
                  value={selected.setup_minutes_planned ? `${selected.setup_minutes_planned} min` : "—"}
                />
                <Field
                  label="Changeover"
                  value={selected.changeover_reason?.replace(/_/g, " ") ?? "—"}
                />
                <Field label="Status" value={statusMeta[selected.actual_status].label} />
              </div>

              {selected.notes && (
                <div className="mt-4 rounded-xl border border-border bg-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Planner notes
                  </p>
                  <p className="mt-1 text-sm text-foreground">{selected.notes}</p>
                </div>
              )}

              <button className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-secondary px-4 text-sm font-bold uppercase tracking-wider hover:bg-muted">
                <FileText className="h-4 w-4" /> Open SOP
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-base font-bold text-foreground", mono && "font-mono")}>{value}</p>
    </div>
  );
}
