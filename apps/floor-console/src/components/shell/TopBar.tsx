import { useEffect, useState } from "react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { Wifi, WifiOff } from "lucide-react";

export function TopBar() {
  const device = useFloorConsole((s) => s.device);
  const isOnline = useFloorConsole((s) => s.isOnline);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-primary-foreground/10 bg-nav px-5 text-nav-foreground">
      <span className="rounded-md bg-accent px-3 py-1.5 font-mono text-sm font-bold uppercase tracking-wider text-accent-foreground">
        {device.wc_id}
      </span>
      <div className="hidden flex-col leading-tight sm:flex">
        <span className="text-xs uppercase tracking-wider text-nav-foreground/60">
          Shift {device.shift}
        </span>
        <span className="text-sm font-semibold">{device.operator_name}</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
            isOnline
              ? "border-status-running/40 text-status-running"
              : "border-status-stopped/50 text-status-stopped"
          }`}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-status-running" : "bg-status-stopped animate-pulse-slow"}`} />
        </div>
        <span className="font-mono text-2xl font-bold tabular-nums text-accent">
          {time}
        </span>
      </div>
    </header>
  );
}
