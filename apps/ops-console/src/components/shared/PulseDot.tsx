// ─── PulseDot — animated status indicator ────────────────────────────────────
import { toneRail, type Tone } from "@/types/common";

interface Props {
  tone?: Tone;
  pulse?: boolean;
}

export function PulseDot({ tone = "accent", pulse = true }: Props) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${toneRail[tone]} ${pulse ? "animate-pulse-dot" : ""}`}
    />
  );
}
