import { useFloorConsole } from "@/store/floorConsoleStore";
import { AlertTriangle } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useFloorConsole((s) => s.isOnline);
  const queued = useFloorConsole((s) => s.queuedEventCount);
  if (isOnline) return null;
  return (
    <div className="flex shrink-0 items-center gap-3 bg-status-stopped px-5 py-2.5 text-sm font-semibold text-status-stopped-foreground">
      <AlertTriangle className="h-4 w-4" />
      <span className="uppercase tracking-wider">
        Offline mode — {queued} event{queued === 1 ? "" : "s"} queued. Will sync when connection restores.
      </span>
    </div>
  );
}
