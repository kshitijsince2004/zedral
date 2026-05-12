// ─── Ops Console — root dashboard ────────────────────────────────────────────
// Thin orchestrator: route definition + shell layout + lazy module switch.
// All data, state, and UI live in their respective modules.
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

// Shell
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { Footer } from "@/components/shell/Footer";

// Shared
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

// Lazy modules
const M1Module = lazy(() =>
  import("@/modules/m1").then((m) => ({ default: m.M1Module })),
);
const M2Module = lazy(() =>
  import("@/modules/m2").then((m) => ({ default: m.M2Module })),
);
const M5aModule = lazy(() =>
  import("@/modules/m5a").then((m) => ({ default: m.M5aModule })),
);
const M6Module = lazy(() =>
  import("@/modules/m6").then((m) => ({ default: m.M6Module })),
);

// State
import { useStore } from "@/state/store";

// Title helpers (imported, not inlined)
import { M5A_SCREEN_TITLE } from "@/modules/m5a/M5aSubNav";
import { M2_SCREEN_TITLE } from "@/modules/m2/M2SubNav";
import { MODULE_META } from "@/constants/modules";
import { toISTClock } from "@/utils/date";

export const Route = createFileRoute("/")({
  component: OpsDashboard,
});

const MODULE_TITLE: Record<string, string> = {
  m1: "Demand & Work Order Dashboard",
  m6: "Live Plant Floor",
};

function OpsDashboard() {
  const activeModule = useStore((s) => s.activeModule);
  const m5aScreen = useStore((s) => s.m5aScreen);
  const m2Screen = useStore((s) => s.m2Screen);

  // IST clock — managed once at the shell level
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const istClock = useMemo(() => toISTClock(now), [now]);

  // Derive page title from active module + sub-screen state
  const pageTitle =
    activeModule === "m5a"
      ? M5A_SCREEN_TITLE[m5aScreen]
      : activeModule === "m2"
      ? M2_SCREEN_TITLE[m2Screen]
      : MODULE_TITLE[activeModule] ?? MODULE_META[activeModule].title;

  const moduleCode = MODULE_META[activeModule].code;

  return (
    <div className="min-h-screen flex bg-secondary/40 text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar activeModule={activeModule} title={pageTitle} istClock={istClock} />

        <main className="flex-1 w-full px-6 py-6 flex flex-col gap-6 overflow-x-hidden">
          <Suspense fallback={<LoadingSkeleton rows={6} cols={4} />}>
            {activeModule === "m1" && <M1Module />}
            {activeModule === "m2" && <M2Module />}
            {activeModule === "m5a" && <M5aModule />}
            {activeModule === "m6" && <M6Module />}
          </Suspense>

          <Footer moduleCode={moduleCode} />
        </main>
      </div>
    </div>
  );
}
