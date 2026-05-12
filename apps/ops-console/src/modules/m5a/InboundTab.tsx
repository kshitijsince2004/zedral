// ─── M5a Inbound expediting tab ──────────────────────────────────────────────
import { TonePill } from "@/components/shared/TonePill";
import { INBOUND } from "@/mocks/m5a";
import { toneText } from "@/types/common";

export function InboundTab() {
  const overdue = INBOUND.filter((i) => i.status === "OVERDUE");
  const onTime = INBOUND.filter((i) => i.status === "ON TIME");

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total inbound" value={String(INBOUND.length)} />
        <Stat label="On time" value={String(onTime.length)} className={toneText.success} />
        <Stat label="Overdue" value={String(overdue.length)} className={toneText.destructive} />
        <Stat label="Total MT" value={`${INBOUND.reduce((s, i) => s + i.mt, 0).toFixed(1)} MT`} />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
            Inbound shipments
          </p>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                {["GR Ref", "Supplier", "Spec", "MT", "Expected", "Age (days)", "Status"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INBOUND.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs">{row.id}</td>
                  <td className="px-3 py-2.5">{row.supplier}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.spec}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.mt.toFixed(1)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.date}</td>
                  <td className={`px-3 py-2.5 font-mono text-xs font-bold ${row.age > 3 ? "text-destructive" : row.age > 0 ? "text-warning" : "text-muted-foreground"}`}>
                    {row.age > 0 ? `+${row.age}d` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <TonePill tone={row.tone}>{row.status}</TonePill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${className}`}>{value}</p>
    </div>
  );
}
