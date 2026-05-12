import { useFloorConsole } from "@/store/floorConsoleStore";
import { Home, Calendar, ArrowLeftRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "home" as const, label: "Home", Icon: Home },
  { id: "schedule" as const, label: "Schedule", Icon: Calendar },
  { id: "handover" as const, label: "Handover", Icon: ArrowLeftRight },
  { id: "menu" as const, label: "Menu", Icon: LayoutGrid },
];

export function BottomTabBar() {
  const activeTab = useFloorConsole((s) => s.activeTab);
  const setTab = useFloorConsole((s) => s.setTab);
  return (
    <nav className="flex h-[72px] shrink-0 items-stretch border-t border-border bg-card">
      {tabs.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
              active ? "text-accent" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />
            <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            {active && (
              <span className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-t-full bg-accent" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
