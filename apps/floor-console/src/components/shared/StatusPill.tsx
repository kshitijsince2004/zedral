import { cn } from "@/lib/utils";

type Status = "running" | "setup" | "stopped" | "idle" | "complete";

const config: Record<Status, { label: string; dot: string; text: string; bg: string; pulse?: boolean }> = {
  running: {
    label: "RUNNING",
    dot: "bg-status-running",
    text: "text-status-running",
    bg: "bg-status-running/10 border-status-running/30",
  },
  setup: {
    label: "SETUP IN PROGRESS",
    dot: "bg-status-setup",
    text: "text-status-setup",
    bg: "bg-status-setup/10 border-status-setup/30",
  },
  stopped: {
    label: "STOPPED",
    dot: "bg-status-stopped",
    text: "text-status-stopped",
    bg: "bg-status-stopped/15 border-status-stopped/40",
    pulse: true,
  },
  idle: {
    label: "IDLE — NO ACTIVE JOB",
    dot: "bg-status-idle",
    text: "text-muted-foreground",
    bg: "bg-muted border-border",
  },
  complete: {
    label: "COMPLETE",
    dot: "bg-status-running",
    text: "text-status-running",
    bg: "bg-status-running/10 border-status-running/30",
  },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", c.dot, c.pulse && "animate-pulse-slow")} />
      {c.label}
    </span>
  );
}
