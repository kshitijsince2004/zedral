// ─── M5a Coils browser tab ───────────────────────────────────────────────────
import { useState } from "react";
import { TonePill } from "@/components/shared/TonePill";
import { COILS } from "@/mocks/m5a";
import { toneText, toneBg, toneBorder } from "@/types/common";
import { STAGE_TONE } from "@/types/m5a";
import type { CoilStage, Coil } from "@/types/m5a";

const STAGES: (CoilStage | "all")[] = [
  "all", "stores", "pickling", "rolling", "annealing", "rewind", "fg", "dispatched",
];

function CoilDetailPane({ coil }: { coil: Coil }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-fit">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Coil Detail</p>
        <p className="mt-1 font-mono text-lg font-bold">{coil.id}</p>
      </div>
      <div className="p-5 space-y-3 text-sm">
        <Row label="Grade" value={coil.grade} mono />
        <Row label="Gauge" value={coil.gauge} mono />
        <Row label="Weight" value={`${coil.weight.toFixed(2)} MT`} mono />
        {coil.weightInitial && (
          <Row label="Initial weight" value={`${coil.weightInitial.toFixed(2)} MT`} mono />
        )}
        <Row label="Stage" value={<TonePill tone={STAGE_TONE[coil.stage]}>{coil.stage}</TonePill>} />
        {coil.reservedFor && <Row label="Reserved for" value={coil.reservedFor} mono />}
        {coil.hold && (
          <Row label="Quality hold" value={<span className="text-destructive font-bold">YES — {coil.ncr}</span>} />
        )}
        <Row label="Heat" value={coil.heat} mono />
        <Row label="Supplier" value={coil.supplier} />
        {coil.sapRef && <Row label="SAP ref" value={coil.sapRef} mono />}
        {coil.grDate && <Row label="GR date" value={coil.grDate} mono />}
        {coil.parent && <Row label="Parent coil" value={coil.parent} mono />}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

export function CoilsTab() {
  const [stageFilter, setStageFilter] = useState<CoilStage | "all">("all");
  const [holdOnly, setHoldOnly] = useState(false);
  const [reservedOnly, setReservedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = COILS.filter((c) => {
    if (stageFilter !== "all" && c.stage !== stageFilter) return false;
    if (holdOnly && !c.hold) return false;
    if (reservedOnly && !c.reservedFor) return false;
    return true;
  });

  const selected = COILS.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {STAGES.map((s) => {
              const active = stageFilter === s;
              const t = s !== "all" ? STAGE_TONE[s] : "muted";
              return (
                <button
                  key={s}
                  onClick={() => setStageFilter(s)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                    active
                      ? `${toneText[t]} ${toneBg[t]} ${toneBorder[t]}`
                      : "border-border text-muted-foreground hover:border-foreground/20"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={holdOnly} onChange={(e) => setHoldOnly(e.target.checked)} className="rounded" />
              Hold only
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={reservedOnly} onChange={(e) => setReservedOnly(e.target.checked)} className="rounded" />
              Reserved only
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[520px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                {["Coil ID", "Grade", "Gauge", "Weight", "Stage", "Reserved For", "Hold", "Supplier", "GR Date"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((coil) => {
                const sel = selectedId === coil.id;
                return (
                  <tr
                    key={coil.id}
                    onClick={() => setSelectedId(sel ? null : coil.id)}
                    className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                      sel ? "bg-accent/10" : "hover:bg-secondary"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">{coil.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{coil.grade}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{coil.gauge}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{coil.weight.toFixed(2)} MT</td>
                    <td className="px-3 py-2.5">
                      <TonePill tone={STAGE_TONE[coil.stage]}>{coil.stage}</TonePill>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {coil.reservedFor ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {coil.hold ? (
                        <TonePill tone="destructive">Hold</TonePill>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{coil.supplier}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{coil.grDate ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        {selected ? (
          <CoilDetailPane coil={selected} />
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 text-center text-sm text-muted-foreground">
            Select a coil to view details
          </div>
        )}
      </div>
    </div>
  );
}
