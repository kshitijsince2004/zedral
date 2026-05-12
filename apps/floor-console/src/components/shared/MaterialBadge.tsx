import { cn } from "@/lib/utils";
import type { CoilLocation } from "@/types";

interface Props {
  location?: CoilLocation;
  className?: string;
}

const cfg: Record<
  Exclude<CoilLocation, null>,
  { label: string; cls: string; emoji: string }
> = {
  at_line: {
    label: "Coil ready · At line",
    cls: "bg-status-running/10 text-status-running border-status-running/30",
    emoji: "🟢",
  },
  at_stores_reserved: {
    label: "Coil at stores · Reserved",
    cls: "bg-status-stopped/15 text-status-stopped border-status-stopped/30",
    emoji: "🟡",
  },
  not_reserved: {
    label: "Coil not reserved — STOP before starting",
    cls: "bg-status-reject/10 text-status-reject border-status-reject/40",
    emoji: "🔴",
  },
};

export function MaterialBadge({ location, className }: Props) {
  if (!location) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground",
          className,
        )}
      >
        ⚪ No coil assigned
      </span>
    );
  }
  const c = cfg[location];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        c.cls,
        className,
      )}
    >
      <span>{c.emoji}</span>
      {c.label}
    </span>
  );
}
