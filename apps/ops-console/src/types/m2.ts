// Re-export shared navigation types from common
export type { M2Screen, NavIntent } from "./common";

// ─── Domain types ─────────────────────────────────────────────────────────────

export type MaterialType = "HR" | "CR" | "FG";
export type ActiveStatus = "active" | "inactive";
export type Priority = "high" | "medium" | "low";
export type WCType = "Rolling" | "Processing";
export type SkillLevel = "Junior" | "Mid" | "Senior";

export interface Material {
  material_code: string;
  grade: string;
  gauge_mm: number;
  width_mm: number;
  type: MaterialType;
  status: ActiveStatus;
}

export interface Customer {
  customer_id: string;
  name: string;
  priority: Priority;
  status: ActiveStatus;
}

export interface WorkCentre {
  wc_id: string;
  name: string;
  type: WCType;
  status: ActiveStatus;
}

export interface RoutingRule {
  id: string;
  material_code: string;
  work_centre: string;
  ideal_rate: number; // MT/hr
  setup_time: number; // minutes
  yield_pct: number;  // 0-100
}

export interface Shift {
  id: string;
  name: string;       // A / B / C
  start: string;      // HH:MM
  end: string;        // HH:MM
  linked_wcs: string[]; // wc_id list
}

export interface Operator {
  operator_id: string;
  name: string;
  skill: SkillLevel;
  work_centre: string; // "" = unassigned
  shift: string;       // shift name or ""
  status: ActiveStatus;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface M2NavRequest {
  screen: import("./common").M2Screen;
  intent?: import("./common").NavIntent;
}

// ─── Health & Issues ──────────────────────────────────────────────────────────

export type IssueSeverity = "critical" | "warning" | "info";

export interface Issue {
  id: string;
  severity: IssueSeverity;
  icon: string;
  title: string;
  impact: string;
  count: number;
  screen: import("./common").M2Screen;
  intent: import("./common").NavIntent;
}

export interface SystemHealth {
  readiness: "ready" | "partial" | "not_ready";
  completeness: number; // 0-100
  breakdown: { label: string; pct: number; screen: import("./common").M2Screen }[];
  issues: Issue[];
  health: "good" | "warning" | "critical";
  health_label: string;
  m2_status: "Configured" | "Partial" | "Not Ready";
  last_updated: Date;
  last_change: { what: string; when: Date } | null;
  last_issue_detected: Date | null;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "issue-resolution"
  | "filter-navigation"
  | "breakdown-drill"
  | "kpi-drill";

export interface AuditEntry {
  id: string;
  ts: string; // ISO string
  user: string;
  action: AuditAction;
  source: string;        // e.g. "Data Health Strip", "Materials KPI"
  target_screen: import("./common").M2Screen;
  intent_label: string;  // human-readable description of the intent
  affected: number;      // count of records the filter/resolution targets
  affected_label: string; // e.g. "materials", "operators"
}

// ─── Audit Counts ─────────────────────────────────────────────────────────────

export interface AuditCounts {
  total: Partial<Record<import("./common").M2Screen, number>>;
  activeByScreen: Partial<Record<import("./common").M2Screen, number>>;
  missingRouting: number;
  withRouting: number;
  incompleteRouting: number;
  inactiveWcUsed: number;
  unassignedOps: number;
  assignedOps: number;
  utilizedWcs: number;
  idleWcs: number;
}

