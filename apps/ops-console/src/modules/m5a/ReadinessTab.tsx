// ─── M5a Readiness tab ───────────────────────────────────────────────────────
import { useState } from "react";
import { TonePill } from "@/components/shared/TonePill";
import { PIPELINE, WORK_ORDERS } from "@/mocks/m5a";
import { daysUntil, dayUrgencyClass, formatCountdown } from "@/utils/date";
import { toneText, toneBg, toneBorder } from "@/types/common";
import { WO_STATUS_TONE, STAGE_TONE } from "@/types/m5a";
import type { CoilStage, WorkOrder } from "@/types/m5a";

// ── WO detail pane ────────────────────────────────────────────────────────────
function WoDetailPane({ wo }: { wo: WorkOrder }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-fit">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">WO Detail</p>
        <p className="mt-1 font-mono text-lg font-bold">{wo.id}</p>
      </div>
      <div className="p-5 space-y-3 text-sm">
        <Row label="Customer" value={wo.customer} />
        <Row label="Spec" value={wo.spec} mono />
        <Row label="Required date" value={wo.reqDate} mono />
        <Row label="Required MT" value={`${wo.reqMt.toFixed(1)} MT`} mono />
        <Row label="Available MT" value={`${wo.availMt.toFixed(1)} MT`} mono />
        {wo.shortfall > 0 && (
          <Row label="Shortfall" value={`${wo.shortfall.toFixed(1)} MT`} mono className="text-destructive font-bold" />
        )}
        <Row label="Status" value={<TonePill tone={WO_STATUS_TONE[wo.status]}>{wo.status}</TonePill>} />
        {wo.resolution && (
          <Row label="Resolution" value={wo.resolution} className="text-warning font-semibold" />
        )}
        {wo.reservedCoils.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Reserved coils</p>
            {wo.reservedCoils.map((c) => (
              <p key={c.id} className="font-mono text-xs">
                {c.id} · {c.mt.toFixed(1)} MT
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${mono ? "font-mono" : ""} ${className ?? ""}`}>{value}</span>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
interface Props {
  recalcSeconds: number;
}

export function ReadinessTab({ recalcSeconds }: Props) {
  const [stageFilter, setStageFilter] = useState<CoilStage | null>(null);
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);

  const filtered = stageFilter
    ? WORK_ORDERS.filter((w) => w.stage === stageFilter)
    : WORK_ORDERS;

  const selected = WORK_ORDERS.find((w) => w.id === selectedWoId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Pipeline header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Stage Pipeline
            </span>
            {stageFilter && (
              <button
                onClick={() => setStageFilter(null)}
                className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                × Clear filter
              </button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Next recalc in{" "}
            <span className="font-mono text-accent font-semibold tabular-nums">
              {formatCountdown(recalcSeconds)}
            </span>
          </div>
        </div>

        {/* Pipeline chips */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-2 overflow-x-auto">
          {PIPELINE.map((node, i) => {
            const active = stageFilter === node.id;
            const t = STAGE_TONE[node.id];
            return (
              <div key={node.id} className="flex items-center gap-2 flex-1 min-w-[100px]">
                <button
                  onClick={() => setStageFilter(active ? null : node.id)}
                  className={`flex-1 rounded-md border px-3 py-2 text-left transition-all ${
                    active
                      ? `${toneBg[t]} ${toneBorder[t]} shadow-sm ring-2 ring-accent/40`
                      : "bg-background border-border hover:border-foreground/20"
                  }`}
                >
                  <div className={`text-[10px] uppercase tracking-wider font-semibold ${toneText[t]}`}>
                    {node.label}
                  </div>
                  <div className="text-lg font-bold tracking-tight text-foreground">{node.count}</div>
                </button>
                {i < PIPELINE.length - 1 && (
                  <span className="text-muted-foreground/50 text-xs">›</span>
                )}
              </div>
            );
          })}
        </div>

        {/* WO table */}
        <div className="overflow-auto max-h-[520px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                {["WO ID", "Customer", "Spec", "Req Date", "Req MT", "Avail MT", "Exp MT", "Shortfall", "Status", "Earliest Ready"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo) => {
                const sel = selectedWoId === wo.id;
                const days = daysUntil(wo.reqDate);
                return (
                  <tr
                    key={wo.id}
                    onClick={() => setSelectedWoId(sel ? null : wo.id)}
                    className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                      sel ? "bg-accent/10" : "hover:bg-secondary"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">{wo.id}</td>
                    <td className="px-3 py-2.5">{wo.customer}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{wo.spec}</td>
                    <td className={`px-3 py-2.5 font-mono text-xs ${dayUrgencyClass(days)}`}>
                      {wo.reqDate}{" "}
                      <span className="text-muted-foreground">({days}d)</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{wo.reqMt.toFixed(1)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{wo.availMt.toFixed(1)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {wo.expectedMt > 0 ? wo.expectedMt.toFixed(1) : "—"}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-xs ${wo.shortfall > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      {wo.shortfall > 0 ? wo.shortfall.toFixed(1) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <TonePill tone={WO_STATUS_TONE[wo.status]}>{wo.status}</TonePill>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {wo.earliestReady}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail pane */}
      <div>
        {selected ? (
          <WoDetailPane wo={selected} />
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 text-center text-sm text-muted-foreground">
            Select a work order to view details
          </div>
        )}
      </div>
    </div>
  );
}
