// ─── M5a KPI summary row ─────────────────────────────────────────────────────
import { KpiCard } from "@/components/shared/KpiCard";
import type { Tone } from "@/types/common";

const KPI_CARDS: { label: string; value: string; sub: string; tone: Tone }[] = [
  { label: "Ready", value: "24", sub: "WOs fully allocated", tone: "success" },
  { label: "Partial", value: "12", sub: "Coils in transit / partial qty", tone: "warning" },
  { label: "Pending", value: "8", sub: "Awaiting inbound arrival", tone: "info" },
  { label: "Shortage", value: "3", sub: "No material path found", tone: "destructive" },
  { label: "Total Stock", value: "847.5 MT", sub: "Across all active stages", tone: "purple" },
];

export function M5aKpiRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {KPI_CARDS.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}
