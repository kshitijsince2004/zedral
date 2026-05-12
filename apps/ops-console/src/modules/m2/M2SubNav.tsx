// ─── M2 sub-navigation title map + tab bar ───────────────────────────────────
import type { M2Screen } from "@/types/common";

export const M2_SCREEN_TITLE: Record<M2Screen, string> = {
  overview: "Master Data Overview",
  materials: "Materials Master",
  customers: "Customer Master",
  workcentres: "Work Centres",
  routing: "Routing & Production Rules",
  shifts: "Shift Configuration",
  operators: "Operators",
  grades: "Material Grades · Steel Catalogue",
  calendar: "Shift Calendar",
  changeover: "Changeover Matrix",
  csvimport: "CSV Import · Data Pipeline",
};

const PRIMARY_TABS: { id: M2Screen; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "materials", label: "Materials" },
  { id: "customers", label: "Customers" },
  { id: "workcentres", label: "Work Centres" },
  { id: "routing", label: "Routing Rules" },
  { id: "shifts", label: "Shifts" },
  { id: "operators", label: "Operators" },
];

const MORE_TABS: { id: M2Screen; label: string }[] = [
  { id: "grades", label: "Grades" },
  { id: "calendar", label: "Calendar" },
  { id: "changeover", label: "Changeover" },
  { id: "csvimport", label: "CSV Import" },
];

interface Props {
  active: M2Screen;
  onChange: (s: M2Screen) => void;
}

export function M2SubNav({ active, onChange }: Props) {
  const inMore = MORE_TABS.some((t) => t.id === active);

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card shadow-sm p-1.5 w-full">
      {PRIMARY_TABS.map((item) => (
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
      <div className="w-px h-5 bg-border mx-1" />
      {MORE_TABS.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            active === item.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : inMore && active === item.id
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
