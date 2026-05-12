// ─── TonePill — reusable status badge ────────────────────────────────────────
import { toneText, toneBg, toneBorder, type Tone } from "@/types/common";

interface Props {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export function TonePill({ tone, children, className = "", size = "md" }: Props) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} font-semibold uppercase tracking-wider ${toneText[tone]} ${toneBg[tone]} ${toneBorder[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
