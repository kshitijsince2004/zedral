import { createFileRoute } from "@tanstack/react-router";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { TopBar } from "@/components/shell/TopBar";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { DevPanel } from "@/components/shell/DevPanel";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { HomeScreen } from "@/components/home/HomeScreen";
import { ScheduleScreen } from "@/components/schedule/ScheduleScreen";
import { HandoverScreen } from "@/components/handover/HandoverScreen";
import { MenuScreen } from "@/components/menu/MenuScreen";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zedral Floor Console — CRS-2 Andon Terminal" },
      {
        name: "description",
        content:
          "Operator touchscreen for the Zedral manufacturing execution system. Capture production events, stoppages, rejects, coil scans and shift handovers from the cold rolling mill floor.",
      },
      { property: "og:title", content: "Zedral Floor Console" },
      {
        property: "og:description",
        content: "Operator-facing MES touchscreen for cold rolling mill lines.",
      },
    ],
  }),
  component: FloorConsole,
});

function FloorConsole() {
  const isAuthenticated = useFloorConsole((s) => s.isAuthenticated);
  const tab = useFloorConsole((s) => s.activeTab);
  const incomingPending = useFloorConsole((s) => s.incomingOperatorPending);

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <Toaster richColors position="top-center" />
        <DevPanel />
      </>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <TopBar />
      <OfflineBanner />
      <main className="relative flex-1 overflow-hidden">
        {tab === "home" && <HomeScreen />}
        {tab === "schedule" && <ScheduleScreen />}
        {tab === "handover" && <HandoverScreen />}
        {tab === "menu" && <MenuScreen />}
        {/* Auto route to handover when incoming pending */}
        {incomingPending && tab !== "handover" && (
          <button
            onClick={() => useFloorConsole.getState().setTab("handover")}
            className="absolute inset-x-4 top-4 z-30 rounded-2xl bg-status-setup px-5 py-3 text-sm font-bold uppercase tracking-wider text-status-setup-foreground shadow-xl animate-fade-in"
          >
            Incoming handover ready · tap to view
          </button>
        )}
      </main>
      <BottomTabBar />
      <DevPanel />
      <Toaster richColors position="top-center" />
    </div>
  );
}
