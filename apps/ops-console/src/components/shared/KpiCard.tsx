// ─── KpiCard — single metric card with left colour rail ──────────────────────
import { toneText, toneRail, type Tone } from "@/types/common";

interface Props {
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  onClick?: () => void;
}

export function KpiCard({ label, value, sub, tone, onClick }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm ${onClick ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${toneRail[tone]}`} />
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={`mt-1 text-3xl font-bold tracking-tight ${toneText[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
