import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useFloorConsole, selectActiveItem, selectNextItem } from "@/store/floorConsoleStore";
import { CurrentJobCard } from "./CurrentJobCard";
import { NextJobCard } from "./NextJobCard";
import { ActionRow } from "./ActionRow";
import { UndoStrip } from "./UndoStrip";
import { StoppageOverlay } from "@/components/stoppage/StoppageOverlay";
import { CompleteJobOverlay } from "@/components/complete/CompleteJobOverlay";
import { RejectOverlay } from "@/components/reject/RejectOverlay";
import { CoilScanScreen } from "@/components/coilscan/CoilScanScreen";
import { Clock } from "lucide-react";
import { toast } from "sonner";

type Overlay = null | "stoppage" | "complete" | "reject" | "coilscan";

export function HomeScreen() {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const startSetup = useFloorConsole((s) => s.startSetup);
  const startProduction = useFloorConsole((s) => s.startProduction);
  const completeSetup = useFloorConsole((s) => s.completeSetup);
  const endStoppage = useFloorConsole((s) => s.endStoppage);
  const next = useFloorConsole(selectNextItem);
  const active = useFloorConsole(selectActiveItem);
  const showHandoverBanner = useFloorConsole((s) => s.showHandoverBanner);
  const setTab = useFloorConsole((s) => s.setTab);
  const rejects = useFloorConsole((s) => s.rejects);

  // Auto-start production when setup is in progress for >0 (here we just expose button via toast)
  useEffect(() => {
    if (active?.actual_status === "setup_in_progress") {
      // no-op; operator confirms via Coil scan flow
    }
  }, [active?.actual_status]);

  return (
    <div className="relative flex h-full flex-col">
      {showHandoverBanner && (
        <div className="flex shrink-0 items-center gap-3 bg-status-stopped px-5 py-3 text-sm font-bold text-status-stopped-foreground">
          <Clock className="h-5 w-5" />
          <span className="uppercase tracking-wider">
            Shift ends in 15 min — prepare handover now
          </span>
          <button
            onClick={() => setTab("handover")}
            className="ml-auto rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground"
          >
            Start handover
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:p-6">
        <div className="flex-1 lg:basis-[55%]">
          <CurrentJobCard onCoilTap={() => setOverlay("coilscan")} />
        </div>
        <div className="flex-1 lg:basis-[45%]">
          <NextJobCard
            onStartSetup={() => {
              if (!next) return;
              startSetup(next.item_id);
              toast.success("Setup started", {
                description: `${next.wo_id} · ${next.grade}`,
              });
              setOverlay("coilscan");
            }}
          />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 lg:px-6 lg:pb-6">
        <ActionRow
          onStoppage={() => setOverlay("stoppage")}
          onComplete={() => setOverlay("complete")}
          onReject={() => setOverlay("reject")}
          onResume={() => {
            endStoppage();
            toast.success("Line resumed");
          }}
        />
        {rejects.length > 0 && (
          <p className="mt-2 text-center text-xs font-semibold text-status-reject">
            ⚠ {rejects.length} reject{rejects.length === 1 ? "" : "s"} raised this shift
          </p>
        )}
        {active?.actual_status === "setup_in_progress" && (
          <button
            onClick={() => {
              completeSetup(active.item_id);
              startProduction(active.item_id);
              toast.success("Setup complete · Production started");
            }}
            className="mt-2 h-12 w-full rounded-xl border-2 border-status-setup bg-status-setup/10 text-sm font-bold uppercase tracking-wider text-status-setup hover:bg-status-setup/20"
          >
            Mark setup complete & start production
          </button>
        )}
      </div>

      <UndoStrip />

      <AnimatePresence>
        {overlay === "stoppage" && <StoppageOverlay onClose={() => setOverlay(null)} />}
        {overlay === "complete" && <CompleteJobOverlay onClose={() => setOverlay(null)} />}
        {overlay === "reject" && <RejectOverlay onClose={() => setOverlay(null)} />}
        {overlay === "coilscan" && <CoilScanScreen onClose={() => setOverlay(null)} />}
      </AnimatePresence>
    </div>
  );
}
