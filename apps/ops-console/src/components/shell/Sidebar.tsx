// ─── Sidebar — module navigation ─────────────────────────────────────────────
import { PulseDot } from "@/components/shared/PulseDot";
import { MODULE_META, NAV_ITEMS } from "@/constants/modules";
import { useRBAC } from "@/hooks/useRBAC";
import { useStore } from "@/state/store";
import zedralLogo from "@/assets/zedral-logo.png";

const NAV_ITEM_DESC: Record<string, string> = {
  m1: "Orders · Readiness · Release",
  m2: "Materials · Customers · Routing",
  m5a: "Readiness · Coils · Inbound",
  m6: "Live lines · Alerts · KPI",
};

const NAV_ITEM_ICON: Record<string, string> = {
  m1: "◎",
  m2: "▦",
  m5a: "⬡",
  m6: "▶",
};

export function Sidebar() {
  const activeModule = useStore((s) => s.activeModule);
  const setActiveModule = useStore((s) => s.setActiveModule);
  const { canAccessModule } = useRBAC();

  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col bg-nav text-nav-foreground">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-3 border-b border-nav-foreground/10">
        <img src={zedralLogo} alt="Zedral" className="h-8 w-auto object-contain" />
        <div className="text-[10px] uppercase tracking-widest text-nav-foreground/50 leading-none">
          MES Suite
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-2">
        <div className="px-3 mb-2 text-[10px] uppercase tracking-widest text-nav-foreground/40 font-semibold">
          Modules
        </div>
        {NAV_ITEMS.filter((item) => canAccessModule(item.id)).map((item) => {
          const meta = MODULE_META[item.id];
          const active = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-nav-foreground/10 text-accent"
                  : "text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/5"
              }`}
            >
              <span className="text-base w-5 text-center mt-0.5">{NAV_ITEM_ICON[item.id]}</span>
              <span className="flex-1 text-left min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-nav-foreground/50">
                    {meta.code}
                  </span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                </span>
                <span className="block text-sm font-semibold mt-0.5">{meta.title}</span>
                <span className="block text-[11px] text-nav-foreground/50 mt-0.5 leading-tight">
                  {NAV_ITEM_DESC[item.id]}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="p-3 border-t border-nav-foreground/10">
        <div className="rounded-md bg-nav-foreground/5 p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-nav-foreground/60 font-semibold">
            <PulseDot tone="success" />
            All systems live
          </div>
          <div className="mt-1 text-[11px] text-nav-foreground/50">Hero Steel · Plant 1100</div>
        </div>
      </div>
    </aside>
  );
}
