// ─── Shared UI tone system ────────────────────────────────────────────────────
export type Tone =
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "purple"
  | "muted"
  | "accent";

export const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
  purple: "text-purple",
  muted: "text-muted-foreground",
  accent: "text-accent",
};

export const toneBg: Record<Tone, string> = {
  success: "bg-success/10",
  warning: "bg-warning/15",
  info: "bg-info/10",
  destructive: "bg-destructive/10",
  purple: "bg-purple/10",
  muted: "bg-muted",
  accent: "bg-accent/15",
};

export const toneBorder: Record<Tone, string> = {
  success: "border-success/30",
  warning: "border-warning/40",
  info: "border-info/30",
  destructive: "border-destructive/30",
  purple: "border-purple/30",
  muted: "border-border",
  accent: "border-accent/40",
};

export const toneRail: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  purple: "bg-purple",
  muted: "bg-muted-foreground/40",
  accent: "bg-accent",
};

// ─── Module navigation ────────────────────────────────────────────────────────
export type ModuleId = "m1" | "m2" | "m5a" | "m6";

export interface ModuleMeta {
  code: string;
  title: string;
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────
export type RBACRole = "admin" | "supervisor" | "operator";

// ─── Cross-module navigation ──────────────────────────────────────────────────
// Screen types are forward-declared here; they will be tightened once the
// per-module type files (types/m2.ts, types/m5a.ts, types/m6.ts) are created.
export type M2Screen =
  | "overview"
  | "materials"
  | "routing"
  | "workcentres"
  | "customers"
  | "operators"
  | "shifts"
  | "grades"
  | "calendar"
  | "changeover"
  | "csvimport";
export type M5aScreen = "readiness" | "coils" | "inbound" | "forecast";
export type M6Screen = "live" | "dispatch" | "alerts" | "kpi";

/** Intent carried when navigating into M2 with a pre-applied filter. */
export type NavIntent =
  | { kind: "missing-routing" }
  | { kind: "incomplete-routing" }
  | { kind: "inactive-wc-used" }
  | { kind: "unassigned-ops" }
  | { kind: "filter-active" }
  | { kind: "filter-all" }
  | { kind: "filter-status"; status: "active" | "inactive" }
  | { kind: "filter-routing"; routing: "configured" | "missing" }
  | { kind: "filter-assignment"; assign: "assigned" | "unassigned" }
  | { kind: "filter-wc-utilized"; utilized: boolean };

/**
 * Discriminated union covering all valid cross-module navigation targets.
 * Used by `navigateTo(request: CrossModuleNavRequest)` in the Zustand store.
 */
export type CrossModuleNavRequest =
  | { module: "m2"; screen: M2Screen; intent?: NavIntent }
  | { module: "m1"; screen: "overview" }
  | { module: "m5a"; screen: M5aScreen }
  | { module: "m6"; screen: M6Screen };
