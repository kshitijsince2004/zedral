import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "amber" | "green" | "red" | "blue" | "neutral";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
  amber:
    "bg-status-stopped text-status-stopped-foreground hover:bg-status-stopped/90 active:bg-status-stopped/80",
  green:
    "bg-status-running text-status-running-foreground hover:bg-status-running/90 active:bg-status-running/80",
  red: "bg-status-reject text-status-reject-foreground hover:bg-status-reject/90 active:bg-status-reject/80",
  blue:
    "bg-status-setup text-status-setup-foreground hover:bg-status-setup/90 active:bg-status-setup/80",
  neutral:
    "bg-secondary text-secondary-foreground border border-border hover:bg-muted",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  label: string;
  size?: "lg" | "xl";
}

export function BigButton({
  variant = "primary",
  icon,
  label,
  className,
  size = "xl",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "flex w-full select-none flex-col items-center justify-center rounded-2xl font-bold uppercase tracking-wider transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        size === "xl" ? "min-h-[88px] gap-2 text-sm" : "min-h-[64px] gap-1 text-xs",
        variants[variant],
        className,
      )}
    >
      {icon && <span className={cn("", size === "xl" ? "text-3xl" : "text-2xl")}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
