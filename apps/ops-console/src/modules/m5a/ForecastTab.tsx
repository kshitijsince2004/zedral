// ─── M5a Shortage forecast tab ───────────────────────────────────────────────
import { TonePill } from "@/components/shared/TonePill";
import { WORK_ORDERS } from "@/mocks/m5a";

export function ForecastTab() {
  const shortages = WORK_ORDERS.filter((w) => w.status === "shortage" || w.shortfall > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
            14-day shortage forecast
          </p>
          <TonePill tone={shortages.length > 0 ? "destructive" : "success"}>
            {shortages.length} at risk
          </TonePill>
        </div>

        {shortages.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No shortages forecast in the next 14 days
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  {["WO ID", "Customer", "Spec", "Req Date", "Shortfall MT", "Resolution"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shortages.map((wo) => (
                  <tr key={wo.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs">{wo.id}</td>
                    <td className="px-3 py-2.5">{wo.customer}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{wo.spec}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{wo.reqDate}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-destructive font-bold">
                      {wo.shortfall.toFixed(1)} MT
                    </td>
                    <td className="px-3 py-2.5">
                      {wo.resolution ? (
                        <TonePill tone="warning">{wo.resolution}</TonePill>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
