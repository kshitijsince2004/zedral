// ─── Date utilities ───────────────────────────────────────────────────────────

/** Days from today until a given ISO date string. Negative = overdue. */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}

/** Tailwind class for urgency colouring of a day-count. */
export function dayUrgencyClass(days: number): string {
  if (days <= 2) return "text-destructive";
  if (days <= 7) return "text-warning";
  return "text-foreground";
}

/** Format IST clock string from a Date object. */
export function toISTClock(date: Date): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60_000;
  const ist = new Date(utc + 5.5 * 3_600_000);
  return ist.toTimeString().slice(0, 8) + " IST";
}

/** Format a countdown in seconds as MM:SS. */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
