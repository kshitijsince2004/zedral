// ─── M5a sub-navigation ───────────────────────────────────────────────────────
import type { M5aScreen } from "@/types/common";

const ITEMS: { id: M5aScreen; label: string }[] = [
  { id: "readiness", label: "Readiness" },
  { id: "coils", label: "Coil Browser" },
  { id: "inbound", label: "Inbound" },
  { id: "forecast", label: "Shortage Forecast" },
];

interface Props {
  active: M5aScreen;
  onChange: (s: M5aScreen) => void;
}

export function M5aSubNav({ active, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-1.5 inline-flex gap-1 self-start">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            active === item.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export const M5A_SCREEN_TITLE: Record<M5aScreen, string> = {
  readiness: "Readiness Dashboard",
  coils: "Coil Inventory Browser",
  inbound: "Inbound Expediting",
  forecast: "Shortage Forecast",
};
