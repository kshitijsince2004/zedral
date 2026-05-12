import { useState } from "react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { Wrench, ChevronUp, ChevronDown } from "lucide-react";

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const isOnline = useFloorConsole((s) => s.isOnline);
  const setOnline = useFloorConsole((s) => s.setOnline);
  const triggerHandoverBanner = useFloorConsole((s) => s.triggerHandoverBanner);
  const setIncomingPending = useFloorConsole((s) => s.setIncomingPending);
  const submitHandover = useFloorConsole((s) => s.submitHandover);
  const handoverStatus = useFloorConsole((s) => s.handoverStatus);
  const resetAll = useFloorConsole((s) => s.resetAll);
  const jumpToState = useFloorConsole((s) => s.jumpToState);
  const fastForward = useFloorConsole((s) => s.fastForwardProgress);
  const enqueueEvent = useFloorConsole((s) => s.enqueueEvent);
  const setTab = useFloorConsole((s) => s.setTab);

  return (
    <div className="absolute bottom-4 right-4 z-[60]">
      {open && (
        <div className="mb-2 w-72 rounded-2xl border border-border bg-card p-4 text-xs shadow-2xl">
          <p className="mb-2 font-bold uppercase tracking-wider text-muted-foreground">
            Dev panel
          </p>
          <div className="space-y-2">
            <Btn onClick={() => setOnline(!isOnline)}>
              Toggle offline ({isOnline ? "online" : "offline"})
            </Btn>
            {!isOnline && (
              <Btn
                onClick={() =>
                  enqueueEvent({
                    id: `evt_${Date.now()}`,
                    type: "test_queued",
                    occurred_at: new Date().toISOString(),
                  })
                }
              >
                Queue test event
              </Btn>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <Btn onClick={() => jumpToState("idle")}>→ Idle</Btn>
              <Btn onClick={() => jumpToState("production_in_progress")}>→ Running</Btn>
              <Btn onClick={() => jumpToState("setup_in_progress")}>→ Setup</Btn>
              <Btn onClick={() => jumpToState("stopped")}>→ Stopped</Btn>
            </div>

            <Btn onClick={fastForward}>Fast-forward to 95%</Btn>

            <Btn onClick={triggerHandoverBanner}>Show handover banner</Btn>
            {handoverStatus === "submitted" && (
              <Btn
                onClick={() => {
                  setIncomingPending(true);
                  setTab("handover");
                }}
              >
                Simulate incoming operator
              </Btn>
            )}
            {handoverStatus === "not_started" && (
              <Btn
                onClick={() => {
                  submitHandover({
                    machine_state: "Left bearing running warm — monitor.",
                    safety_notes: "Oil spill near coil stand, cleaned but check.",
                    pending_items: ["Maintenance call for roll alignment — chase"],
                  });
                  setTab("handover");
                }}
              >
                Quick submit handover
              </Btn>
            )}

            <Btn onClick={resetAll} tone="danger">
              Reset all state
            </Btn>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-xl"
      >
        {open ? <ChevronDown className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
        {!open && (
          <ChevronUp className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent text-accent-foreground" />
        )}
      </button>
    </div>
  );
}

function Btn({
  onClick,
  children,
  tone,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
        tone === "danger"
          ? "bg-status-reject/10 text-status-reject hover:bg-status-reject/20"
          : "bg-secondary text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
