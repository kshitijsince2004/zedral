// ─── Topbar — sticky content header ──────────────────────────────────────────
import { PulseDot } from "@/components/shared/PulseDot";
import { MODULE_META } from "@/constants/modules";
import { useRBAC } from "@/hooks/useRBAC";
import type { ModuleId } from "@/types/common";

interface Props {
  activeModule: ModuleId;
  title: string;
  istClock: string;
}

const SEARCH_PLACEHOLDER: Record<ModuleId, string> = {
  m1: "Search WO ID / customer / material…",
  m2: "Search materials / WC / operators…",
  m5a: "Search coil ID / grade / WO…",
  m6: "Search line / WO / operator…",
};

const STATUS_LABEL: Record<ModuleId, string> = {
  m1: "M1 Control Live",
  m2: "M2 Control Live",
  m5a: "SAP MM live",
  m6: "Floor Live",
};

export function Topbar({ activeModule, title, istClock }: Props) {
  const meta = MODULE_META[activeModule];
  const { can } = useRBAC();
  // Reserve + shortages only relevant in M5a (material/inventory module)
  const canReserve = can("reserve_coil") && activeModule === "m5a";

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
      <div className="px-6 h-16 flex items-center gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
            {meta.code} · {meta.title}
          </div>
          <h1 className="text-lg font-semibold tracking-tight leading-tight truncate">{title}</h1>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              ⌕
            </span>
            <input
              placeholder={SEARCH_PLACEHOLDER[activeModule]}
              className="h-9 w-72 rounded-full border border-border bg-secondary/60 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          {canReserve && (
            <button className="h-9 inline-flex items-center gap-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              + Reserve
            </button>
          )}
        </div>

        {canReserve && (
          <span className="hidden xl:inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-warning">
            <PulseDot tone="warning" />3 shortages
          </span>
        )}

        <span className="hidden lg:inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-success">
          <PulseDot tone="success" />
          {STATUS_LABEL[activeModule]}
        </span>

        <span className="font-mono text-sm text-foreground tracking-wider tabular-nums">{istClock}</span>
      </div>
    </header>
  );
}
