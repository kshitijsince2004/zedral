import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  unit?: string;
  className?: string;
  disabled?: boolean;
  decimals?: number;
}

export function NumberInput({
  value,
  onChange,
  step = 0.1,
  min = 0,
  unit = "MT",
  className,
  disabled,
  decimals = 2,
}: Props) {
  const set = (v: number) => onChange(Math.max(min, Number(v.toFixed(decimals))));
  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => set(value - step)}
        className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary text-foreground disabled:opacity-40 active:bg-muted"
        aria-label="decrease"
      >
        <Minus className="h-6 w-6" />
      </button>
      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          disabled={disabled}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => set(parseFloat(e.target.value || "0"))}
          className="h-16 w-full rounded-xl border border-input bg-background px-4 pr-14 text-center font-mono text-2xl font-bold tracking-tight text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {unit}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => set(value + step)}
        className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary text-foreground disabled:opacity-40 active:bg-muted"
        aria-label="increase"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
