import { useEffect, useMemo, useState } from "react";
import {
  GradesScreen,
  ShiftCalendarScreen,
  ChangeoverMatrixScreen,
  CsvImportScreen,
} from "./M2Extensions";

// ============================================================
// M2 — Master Data Management (MES Control Layer)
// Plant Head / Planner admin console for the manufacturing system
// Light Zedral theme · table-first · drawer add/edit · ≤3 clicks
// Now with: data health strip, KPI strips, completeness score,
// system readiness, relational columns, quick actions.
// ============================================================

export type M2Screen =
  | "overview"
  | "materials"
  | "customers"
  | "workcentres"
  | "routing"
  | "shifts"
  | "operators"
  | "grades"
  | "calendar"
  | "changeover"
  | "csvimport";

// ---------------- Domain types ----------------
type MaterialType = "HR" | "CR" | "FG";
type ActiveStatus = "active" | "inactive";
type Priority = "high" | "medium" | "low";
type WCType = "Rolling" | "Processing";
type SkillLevel = "Junior" | "Mid" | "Senior";

interface Material {
  material_code: string;
  grade: string;
  gauge_mm: number;
  width_mm: number;
  type: MaterialType;
  status: ActiveStatus;
}

interface Customer {
  customer_id: string;
  name: string;
  priority: Priority;
  status: ActiveStatus;
}

interface WorkCentre {
  wc_id: string;
  name: string;
  type: WCType;
  status: ActiveStatus;
}

interface RoutingRule {
  id: string;
  material_code: string;
  work_centre: string;
  ideal_rate: number; // MT/hr
  setup_time: number; // minutes
  yield_pct: number; // 0-100
}

interface Shift {
  id: string;
  name: string; // A / B / C
  start: string; // HH:MM
  end: string;
  linked_wcs: string[]; // wc_id list
}

interface Operator {
  operator_id: string;
  name: string;
  skill: SkillLevel;
  work_centre: string; // "" = unassigned
  shift: string; // shift name "A"/"B"/"C" or ""
  status: ActiveStatus;
}

// ---------------- Seed data ----------------
const SEED_MATERIALS: Material[] = [
  { material_code: "HR-IS513-D-045-1250", grade: "IS513-D", gauge_mm: 0.45, width_mm: 1250, type: "HR", status: "active" },
  { material_code: "HR-IS5986-Fe410-080-1250", grade: "IS5986-Fe410", gauge_mm: 0.8, width_mm: 1250, type: "HR", status: "active" },
  { material_code: "CR-IS513-CR2-060-1250", grade: "IS513-CR2", gauge_mm: 0.6, width_mm: 1250, type: "CR", status: "active" },
  { material_code: "CR-IS1079-D-100-1200", grade: "IS1079-D", gauge_mm: 1.0, width_mm: 1200, type: "CR", status: "active" },
  { material_code: "FG-IS513-CR4-050-1000", grade: "IS513-CR4", gauge_mm: 0.5, width_mm: 1000, type: "FG", status: "inactive" },
  { material_code: "HR-IS5986-Fe350-450-1050", grade: "IS5986-Fe350", gauge_mm: 4.5, width_mm: 1050, type: "HR", status: "active" },
];

const SEED_CUSTOMERS: Customer[] = [
  { customer_id: "C-1001", name: "Maruti Suzuki", priority: "high", status: "active" },
  { customer_id: "C-1002", name: "Tata Motors", priority: "high", status: "active" },
  { customer_id: "C-1003", name: "Mahindra", priority: "medium", status: "active" },
  { customer_id: "C-1004", name: "JSW Auto", priority: "medium", status: "active" },
  { customer_id: "C-1005", name: "Hyundai India", priority: "high", status: "active" },
  { customer_id: "C-1006", name: "Ashok Leyland", priority: "low", status: "inactive" },
];

const SEED_WORKCENTRES: WorkCentre[] = [
  { wc_id: "CRS-1", name: "Cold Rolling Stand 1", type: "Rolling", status: "active" },
  { wc_id: "CRS-2", name: "Cold Rolling Stand 2", type: "Rolling", status: "active" },
  { wc_id: "CRS-3", name: "Cold Rolling Stand 3", type: "Rolling", status: "active" },
  { wc_id: "PKL-1", name: "Pickling Line 1", type: "Processing", status: "active" },
  { wc_id: "ANN-1", name: "Annealing Furnace 1", type: "Processing", status: "active" },
  { wc_id: "RWD-1", name: "Rewind Line 1", type: "Processing", status: "inactive" },
];

const SEED_ROUTING: RoutingRule[] = [
  { id: "r1", material_code: "CR-IS513-CR2-060-1250", work_centre: "CRS-1", ideal_rate: 18, setup_time: 45, yield_pct: 96 },
  { id: "r2", material_code: "CR-IS513-CR2-060-1250", work_centre: "CRS-2", ideal_rate: 17, setup_time: 50, yield_pct: 95 },
  { id: "r3", material_code: "CR-IS1079-D-100-1200", work_centre: "CRS-2", ideal_rate: 22, setup_time: 60, yield_pct: 94 },
  { id: "r4", material_code: "HR-IS5986-Fe410-080-1250", work_centre: "PKL-1", ideal_rate: 35, setup_time: 30, yield_pct: 98 },
  { id: "r5", material_code: "HR-IS5986-Fe350-450-1050", work_centre: "ANN-1", ideal_rate: 12, setup_time: 140, yield_pct: 99 },
  // Note: HR-IS513-D-045-1250 and FG-IS513-CR4-050-1000 deliberately have NO routing → drives "missing routing" alerts.
];

const SEED_SHIFTS: Shift[] = [
  { id: "s1", name: "A", start: "06:00", end: "14:00", linked_wcs: ["CRS-1", "CRS-2", "PKL-1"] },
  { id: "s2", name: "B", start: "14:00", end: "22:00", linked_wcs: ["CRS-2", "CRS-3", "ANN-1"] },
  { id: "s3", name: "C", start: "22:00", end: "06:00", linked_wcs: ["CRS-1", "CRS-3"] },
];

const SEED_OPERATORS: Operator[] = [
  { operator_id: "OP-2001", name: "Ramesh Kumar", skill: "Senior", work_centre: "CRS-2", shift: "A", status: "active" },
  { operator_id: "OP-2002", name: "Anil Verma", skill: "Mid", work_centre: "CRS-1", shift: "A", status: "active" },
  { operator_id: "OP-2003", name: "Suresh Patil", skill: "Senior", work_centre: "CRS-3", shift: "B", status: "active" },
  { operator_id: "OP-2004", name: "Deepak Joshi", skill: "Junior", work_centre: "PKL-1", shift: "A", status: "active" },
  { operator_id: "OP-2005", name: "Pradeep Singh", skill: "Mid", work_centre: "ANN-1", shift: "B", status: "inactive" },
  { operator_id: "OP-2006", name: "Vikram Rao", skill: "Junior", work_centre: "", shift: "", status: "active" },
  { operator_id: "OP-2007", name: "Manoj Shah", skill: "Mid", work_centre: "", shift: "C", status: "active" },
];

// ---------------- Tone helpers ----------------
type Tone = "success" | "warning" | "info" | "destructive" | "muted" | "purple";
const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
  purple: "text-purple",
};
const toneBg: Record<Tone, string> = {
  success: "bg-success/10",
  warning: "bg-warning/15",
  info: "bg-info/10",
  destructive: "bg-destructive/10",
  muted: "bg-muted",
  purple: "bg-purple/10",
};
const toneBorder: Record<Tone, string> = {
  success: "border-success/30",
  warning: "border-warning/40",
  info: "border-info/30",
  destructive: "border-destructive/30",
  muted: "border-border",
  purple: "border-purple/30",
};
const toneRail: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
  purple: "bg-purple",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneText[tone]} ${toneBg[tone]} ${toneBorder[tone]}`}
    >
      {children}
    </span>
  );
}

function StatusPill({ s }: { s: ActiveStatus }) {
  return <Pill tone={s === "active" ? "success" : "destructive"}>{s}</Pill>;
}

const PRIORITY_TONE: Record<Priority, Tone> = { high: "destructive", medium: "warning", low: "info" };
const TYPE_TONE: Record<MaterialType, Tone> = { HR: "info", CR: "purple", FG: "success" };
const SKILL_TONE: Record<SkillLevel, Tone> = { Junior: "info", Mid: "warning", Senior: "success" };

// ============================================================
// Derived metrics — system readiness + completeness + alerts
// ============================================================
export type IssueSeverity = "critical" | "warning" | "info";
export interface Issue {
  id: string;
  severity: IssueSeverity;
  icon: string;
  title: string;
  impact: string;
  count: number;
  screen: M2Screen;
  intent: NavIntent;
}
export type NavIntent =
  | { kind: "missing-routing" }
  | { kind: "incomplete-routing" }
  | { kind: "inactive-wc-used" }
  | { kind: "unassigned-ops" }
  | { kind: "filter-active" }
  | { kind: "filter-all" }
  | { kind: "filter-status"; status: ActiveStatus }
  | { kind: "filter-routing"; routing: "configured" | "missing" }
  | { kind: "filter-assignment"; assign: "assigned" | "unassigned" }
  | { kind: "filter-wc-utilized"; utilized: boolean };

interface SystemHealth {
  readiness: "ready" | "partial" | "not_ready";
  completeness: number; // 0-100
  breakdown: { label: string; pct: number; screen: M2Screen }[];
  issues: Issue[];
  health: "good" | "warning" | "critical";
  health_label: string;
  m2_status: "Configured" | "Partial" | "Not Ready";
  last_updated: Date;
  last_change: { what: string; when: Date } | null;
  last_issue_detected: Date | null;
}

function computeHealth(
  materials: Material[],
  workCentres: WorkCentre[],
  routing: RoutingRule[],
  operators: Operator[],
  lastUpdated: Date,
  lastChange: { what: string; when: Date } | null,
  lastIssueDetected: Date | null,
): SystemHealth {
  const activeMats = materials.filter((m) => m.status === "active");
  const matsWithRouting = activeMats.filter((m) =>
    routing.some((r) => r.material_code === m.material_code),
  );
  const missingRoutingCount = activeMats.length - matsWithRouting.length;

  const utilizedWcIds = new Set(routing.map((r) => r.work_centre));
  const inactiveButUsed = workCentres.filter(
    (w) => w.status === "inactive" && utilizedWcIds.has(w.wc_id),
  );

  const unassignedOps = operators.filter((o) => !o.work_centre || !o.shift);

  // Routing referencing missing/inactive material
  const incompleteRouting = routing.filter((r) => {
    const m = materials.find((mm) => mm.material_code === r.material_code);
    const w = workCentres.find((ww) => ww.wc_id === r.work_centre);
    if (!m || !w) return true;
    if (r.ideal_rate <= 0 || r.yield_pct <= 0 || r.yield_pct > 100) return true;
    return false;
  });

  // Completeness percentages
  const matPct = activeMats.length === 0 ? 0 : (matsWithRouting.length / activeMats.length) * 100;
  const routPct =
    routing.length === 0 ? 0 : ((routing.length - incompleteRouting.length) / routing.length) * 100;
  const wcPct =
    workCentres.length === 0
      ? 0
      : (workCentres.filter((w) => w.status === "active").length / workCentres.length) * 100;
  const opsPct =
    operators.length === 0
      ? 0
      : ((operators.length - unassignedOps.length) / operators.length) * 100;
  const completeness = Math.round((matPct + routPct + wcPct + opsPct) / 4);

  // Issues — structured + actionable
  const issues: Issue[] = [];
  if (missingRoutingCount > 0)
    issues.push({
      id: "missing-routing",
      severity: "critical",
      icon: "⛔",
      title: `${missingRoutingCount} active material${missingRoutingCount > 1 ? "s" : ""} missing routing`,
      impact: "Blocks production planning — affected materials cannot be scheduled.",
      count: missingRoutingCount,
      screen: "materials",
      intent: { kind: "filter-routing", routing: "missing" },
    });
  if (inactiveButUsed.length > 0)
    issues.push({
      id: "inactive-wc-used",
      severity: "critical",
      icon: "⛔",
      title: `${inactiveButUsed.length} work centre${inactiveButUsed.length > 1 ? "s" : ""} inactive but referenced in routing`,
      impact: "Routing rules point to disabled lines — production will fail at dispatch.",
      count: inactiveButUsed.length,
      screen: "workcentres",
      intent: { kind: "filter-status", status: "inactive" },
    });
  if (unassignedOps.length > 0)
    issues.push({
      id: "unassigned-ops",
      severity: "warning",
      icon: "👤",
      title: `${unassignedOps.length} operator${unassignedOps.length > 1 ? "s" : ""} unassigned`,
      impact: "Cannot be scheduled to a work centre or shift until assigned.",
      count: unassignedOps.length,
      screen: "operators",
      intent: { kind: "filter-assignment", assign: "unassigned" },
    });
  if (incompleteRouting.length > 0)
    issues.push({
      id: "incomplete-routing",
      severity: "info",
      icon: "ⓘ",
      title: `${incompleteRouting.length} routing rule${incompleteRouting.length > 1 ? "s" : ""} incomplete`,
      impact: "Rules reference missing data or invalid yield/rate — review needed.",
      count: incompleteRouting.length,
      screen: "routing",
      intent: { kind: "incomplete-routing" },
    });

  // Sort by severity: critical → warning → info
  const SEV_ORDER: Record<IssueSeverity, number> = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  // Readiness rollup
  const critical = issues.some((a) => a.severity === "critical");
  const warning = issues.some((a) => a.severity === "warning");
  const readiness: SystemHealth["readiness"] = critical
    ? "not_ready"
    : warning
      ? "partial"
      : "ready";
  const health: SystemHealth["health"] = critical ? "critical" : warning ? "warning" : "good";
  const health_label = critical ? "Critical" : warning ? "Warning" : "Good";
  const m2_status: SystemHealth["m2_status"] =
    completeness >= 95 ? "Configured" : completeness >= 60 ? "Partial" : "Not Ready";

  return {
    readiness,
    completeness,
    breakdown: [
      { label: "Materials", pct: Math.round(matPct), screen: "materials" },
      { label: "Routing", pct: Math.round(routPct), screen: "routing" },
      { label: "Work Centres", pct: Math.round(wcPct), screen: "workcentres" },
      { label: "Operators", pct: Math.round(opsPct), screen: "operators" },
    ],
    issues,
    health,
    health_label,
    m2_status,
    last_updated: lastUpdated,
    last_change: lastChange,
    last_issue_detected: lastIssueDetected,
  };
}

// ============================================================
// Audit Trail — log resolution attempts & filter navigations
// ============================================================
export type AuditAction =
  | "issue-resolution"
  | "filter-navigation"
  | "breakdown-drill"
  | "kpi-drill";

export interface AuditEntry {
  id: string;
  ts: Date;
  user: string;
  action: AuditAction;
  source: string; // e.g. "Data Health Strip", "Materials KPI", "Readiness Banner"
  target_screen: M2Screen;
  intent_label: string; // human-readable description of the intent
  affected: number; // count of records the filter/resolution targets
  affected_label: string; // e.g. "materials", "operators"
}

const AUDIT_USER = "ramesh.kumar@plant"; // mock signed-in plant head

function describeIntent(
  intent: NavIntent | undefined,
  screen: M2Screen,
  ctx: AuditCounts,
): { label: string; affected: number; affected_label: string } {
  const labelFor = (s: M2Screen) =>
    s === "overview" ? "overview" :
    s === "materials" ? "materials" :
    s === "workcentres" ? "work centres" :
    s === "routing" ? "routing rules" :
    s === "operators" ? "operators" :
    s === "shifts" ? "shifts" :
    s === "grades" ? "material grades" :
    s === "calendar" ? "calendar entries" :
    s === "changeover" ? "changeover cells" :
    s === "csvimport" ? "import jobs" : "customers";

  if (!intent) {
    return { label: `Open ${labelFor(screen)}`, affected: ctx.total[screen] ?? 0, affected_label: labelFor(screen) };
  }
  switch (intent.kind) {
    case "missing-routing":
      return { label: "Missing routing", affected: ctx.missingRouting, affected_label: "materials" };
    case "incomplete-routing":
      return { label: "Incomplete routing rules", affected: ctx.incompleteRouting, affected_label: "rules" };
    case "inactive-wc-used":
      return { label: "Inactive WC referenced", affected: ctx.inactiveWcUsed, affected_label: "work centres" };
    case "unassigned-ops":
      return { label: "Unassigned operators", affected: ctx.unassignedOps, affected_label: "operators" };
    case "filter-active":
      return { label: "Filter: active", affected: ctx.activeByScreen[screen] ?? 0, affected_label: labelFor(screen) };
    case "filter-all":
      return { label: "Filter: all", affected: ctx.total[screen] ?? 0, affected_label: labelFor(screen) };
    case "filter-status":
      return {
        label: `Filter: status = ${intent.status}`,
        affected:
          intent.status === "active"
            ? ctx.activeByScreen[screen] ?? 0
            : (ctx.total[screen] ?? 0) - (ctx.activeByScreen[screen] ?? 0),
        affected_label: labelFor(screen),
      };
    case "filter-routing":
      return {
        label: `Filter: routing = ${intent.routing}`,
        affected: intent.routing === "missing" ? ctx.missingRouting : ctx.withRouting,
        affected_label: "materials",
      };
    case "filter-assignment":
      return {
        label: `Filter: ${intent.assign}`,
        affected: intent.assign === "unassigned" ? ctx.unassignedOps : ctx.assignedOps,
        affected_label: "operators",
      };
    case "filter-wc-utilized":
      return {
        label: `Filter: ${intent.utilized ? "utilized" : "idle"}`,
        affected: intent.utilized ? ctx.utilizedWcs : ctx.idleWcs,
        affected_label: "work centres",
      };
  }
}

interface AuditCounts {
  total: Partial<Record<M2Screen, number>>;
  activeByScreen: Partial<Record<M2Screen, number>>;
  missingRouting: number;
  withRouting: number;
  incompleteRouting: number;
  inactiveWcUsed: number;
  unassignedOps: number;
  assignedOps: number;
  utilizedWcs: number;
  idleWcs: number;
}

// ============================================================
// Top-level module
// ============================================================
export interface M2NavRequest {
  screen: M2Screen;
  intent?: NavIntent;
}

export function M2Module({
  screen,
  intent,
  onNavigate,
}: {
  screen: M2Screen;
  intent?: NavIntent;
  onNavigate?: (req: M2NavRequest) => void;
}) {
  const [materials, setMaterials] = useState<Material[]>(SEED_MATERIALS);
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [workCentres, setWorkCentres] = useState<WorkCentre[]>(SEED_WORKCENTRES);
  const [routing, setRouting] = useState<RoutingRule[]>(SEED_ROUTING);
  const [shifts, setShifts] = useState<Shift[]>(SEED_SHIFTS);
  const [operators, setOperators] = useState<Operator[]>(SEED_OPERATORS);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [lastChange, setLastChange] = useState<{ what: string; when: Date } | null>(null);
  const [lastIssueDetected, setLastIssueDetected] = useState<Date | null>(null);
  const isFirst = useMemo(() => ({ current: true }), []);

  // Bump lastUpdated and last_change whenever any master changes
  useEffect(() => {
    setLastUpdated(new Date());
  }, [materials, customers, workCentres, routing, shifts, operators]);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setLastChange({ what: "Materials updated", when: new Date() });
  }, [materials, isFirst]);
  useEffect(() => {
    if (!isFirst.current) setLastChange({ what: "Routing updated", when: new Date() });
  }, [routing, isFirst]);
  useEffect(() => {
    if (!isFirst.current) setLastChange({ what: "Work centres updated", when: new Date() });
  }, [workCentres, isFirst]);
  useEffect(() => {
    if (!isFirst.current) setLastChange({ what: "Operators updated", when: new Date() });
  }, [operators, isFirst]);

  const health = useMemo(
    () =>
      computeHealth(
        materials,
        workCentres,
        routing,
        operators,
        lastUpdated,
        lastChange,
        lastIssueDetected,
      ),
    [materials, workCentres, routing, operators, lastUpdated, lastChange, lastIssueDetected],
  );

  // Track when issues first appear
  useEffect(() => {
    if (health.issues.length > 0 && !lastIssueDetected) setLastIssueDetected(new Date());
    if (health.issues.length === 0 && lastIssueDetected) setLastIssueDetected(null);
  }, [health.issues.length, lastIssueDetected]);

  // Derived per-material relations
  const materialRelations = useMemo(() => {
    const map: Record<string, { wcs: string[]; configured: boolean }> = {};
    for (const m of materials) {
      const matched = routing.filter((r) => r.material_code === m.material_code);
      map[m.material_code] = {
        wcs: Array.from(new Set(matched.map((r) => r.work_centre))),
        configured: matched.length > 0,
      };
    }
    return map;
  }, [materials, routing]);

  // Derived per-WC relations
  const wcRelations = useMemo(() => {
    const map: Record<string, { mats: number; ops: number; utilized: boolean }> = {};
    for (const w of workCentres) {
      const mats = new Set(routing.filter((r) => r.work_centre === w.wc_id).map((r) => r.material_code));
      const ops = operators.filter((o) => o.work_centre === w.wc_id).length;
      map[w.wc_id] = { mats: mats.size, ops, utilized: mats.size > 0 };
    }
    return map;
  }, [workCentres, routing, operators]);

  // Shift -> capacity hrs * #wc
  const shiftRelations = useMemo(() => {
    const map: Record<string, { capacity: number }> = {};
    for (const s of shifts) {
      const dur = parseFloat(shiftDuration(s.start, s.end));
      map[s.id] = { capacity: dur * s.linked_wcs.length };
    }
    return map;
  }, [shifts]);

  // ---------- Audit trail ----------
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);

  const auditCounts: AuditCounts = useMemo(() => {
    const activeMats = materials.filter((m) => m.status === "active");
    const matsWithRouting = activeMats.filter((m) =>
      routing.some((r) => r.material_code === m.material_code),
    );
    const utilizedWcIds = new Set(routing.map((r) => r.work_centre));
    const inactiveButUsed = workCentres.filter(
      (w) => w.status === "inactive" && utilizedWcIds.has(w.wc_id),
    );
    const incomplete = routing.filter((r) => {
      const m = materials.find((mm) => mm.material_code === r.material_code);
      const w = workCentres.find((ww) => ww.wc_id === r.work_centre);
      if (!m || !w) return true;
      if (r.ideal_rate <= 0 || r.yield_pct <= 0 || r.yield_pct > 100) return true;
      return false;
    });
    const unassigned = operators.filter((o) => !o.work_centre || !o.shift);
    const utilizedWcs = workCentres.filter((w) => utilizedWcIds.has(w.wc_id)).length;
    return {
      total: {
        materials: materials.length,
        customers: customers.length,
        workcentres: workCentres.length,
        routing: routing.length,
        shifts: shifts.length,
        operators: operators.length,
      },
      activeByScreen: {
        materials: materials.filter((m) => m.status === "active").length,
        customers: customers.filter((c) => c.status === "active").length,
        workcentres: workCentres.filter((w) => w.status === "active").length,
        routing: routing.length,
        shifts: shifts.length,
        operators: operators.filter((o) => o.status === "active").length,
      },
      missingRouting: activeMats.length - matsWithRouting.length,
      withRouting: matsWithRouting.length,
      incompleteRouting: incomplete.length,
      inactiveWcUsed: inactiveButUsed.length,
      unassignedOps: unassigned.length,
      assignedOps: operators.length - unassigned.length,
      utilizedWcs,
      idleWcs: workCentres.length - utilizedWcs,
    };
  }, [materials, customers, workCentres, routing, shifts, operators]);

  const logAudit = (entry: Omit<AuditEntry, "id" | "ts" | "user">) => {
    setAuditLog((prev) =>
      [
        {
          ...entry,
          id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ts: new Date(),
          user: AUDIT_USER,
        },
        ...prev,
      ].slice(0, 200),
    );
  };

  const goto = (
    req: M2NavRequest,
    source = "Navigation",
    action: AuditAction = "filter-navigation",
  ) => {
    const meta = describeIntent(req.intent, req.screen, auditCounts);
    logAudit({
      action,
      source,
      target_screen: req.screen,
      intent_label: meta.label,
      affected: meta.affected,
      affected_label: meta.affected_label,
    });
    onNavigate?.(req);
  };

  const gotoFromIssue = (req: M2NavRequest, source: string) =>
    goto(req, source, "issue-resolution");
  const gotoFromBreakdown = (req: M2NavRequest) =>
    goto(req, "Completeness Breakdown", "breakdown-drill");
  const gotoFromKpi = (req: M2NavRequest, source: string) =>
    goto(req, source, "kpi-drill");

  return (
    <div className="flex flex-col gap-5">
      {screen === "overview" && (
        <>
          <ControlHeader
            health={health}
            onNavigate={(r) => gotoFromIssue(r, "Readiness Banner")}
            onBreakdownNavigate={gotoFromBreakdown}
            onOpenAudit={() => setAuditOpen(true)}
            auditCount={auditLog.length}
          />
          <DataHealthStrip
            issues={health.issues}
            onNavigate={(r) => gotoFromIssue(r, "Data Health Strip")}
          />
          <ImpactDrilldown
            issues={health.issues}
            materials={materials}
            workCentres={workCentres}
            routing={routing}
            operators={operators}
            shifts={shifts}
            onNavigate={(r) => gotoFromIssue(r, "Impact Drilldown")}
          />
        </>
      )}

      {screen === "materials" && (
        <>
          <MaterialsKpi
            materials={materials}
            relations={materialRelations}
            onNavigate={(r) => gotoFromKpi(r, "Materials KPI")}
          />
          <MaterialsScreen
            rows={materials}
            setRows={setMaterials}
            relations={materialRelations}
            initialIntent={intent}
          />
        </>
      )}

      {screen === "customers" && (
        <CustomersScreen rows={customers} setRows={setCustomers} />
      )}

      {screen === "workcentres" && (
        <>
          <WorkCentresKpi
            workCentres={workCentres}
            relations={wcRelations}
            onNavigate={(r) => gotoFromKpi(r, "Work Centres KPI")}
          />
          <WorkCentresScreen
            rows={workCentres}
            setRows={setWorkCentres}
            relations={wcRelations}
            initialIntent={intent}
          />
        </>
      )}

      {screen === "routing" && (
        <>
          <RoutingKpi
            routing={routing}
            materials={materials}
            workCentres={workCentres}
            onNavigate={(r) => gotoFromKpi(r, "Routing KPI")}
          />
          <RoutingScreen
            rows={routing}
            setRows={setRouting}
            materials={materials}
            workCentres={workCentres}
            initialIntent={intent}
          />
        </>
      )}

      {screen === "shifts" && (
        <ShiftsScreen
          rows={shifts}
          setRows={setShifts}
          workCentres={workCentres}
          relations={shiftRelations}
        />
      )}

      {screen === "operators" && (
        <>
          <OperatorsKpi
            operators={operators}
            onNavigate={(r) => gotoFromKpi(r, "Operators KPI")}
          />
          <OperatorsScreen
            rows={operators}
            setRows={setOperators}
            workCentres={workCentres}
            shifts={shifts}
            initialIntent={intent}
          />
        </>
      )}

      {screen === "grades" && <GradesScreen materials={materials} />}
      {screen === "calendar" && <ShiftCalendarScreen shifts={shifts} workCentres={workCentres} />}
      {screen === "changeover" && <ChangeoverMatrixScreen />}
      {screen === "csvimport" && <CsvImportScreen />}

      <AuditTrailDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        entries={auditLog}
        onClear={() => setAuditLog([])}
      />
    </div>
  );
}

// ============================================================
// Control Header (status, completeness, last updated)
// ============================================================
function timeAgo(d: Date | null): string {
  if (!d) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleDateString();
}

function ControlHeader({
  health,
  onNavigate,
  onBreakdownNavigate,
  onOpenAudit,
  auditCount,
}: {
  health: SystemHealth;
  onNavigate: (req: M2NavRequest) => void;
  onBreakdownNavigate: (req: M2NavRequest) => void;
  onOpenAudit: () => void;
  auditCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const readinessTone: Tone =
    health.readiness === "ready" ? "success" : health.readiness === "partial" ? "warning" : "destructive";
  const healthTone: Tone =
    health.health === "good" ? "success" : health.health === "warning" ? "warning" : "destructive";
  const m2Tone: Tone =
    health.m2_status === "Configured" ? "success" : health.m2_status === "Partial" ? "warning" : "destructive";

  const readinessLabel =
    health.readiness === "ready" ? "SYSTEM READY" : health.readiness === "partial" ? "SYSTEM PARTIAL" : "SYSTEM NOT READY";
  const blockingIssues = health.issues.filter((i) => i.severity !== "info");

  return (
    <div className="rounded-2xl border border-border bg-card shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Top: readiness banner */}
      <div
        className={`px-5 py-3 border-b ${toneBg[readinessTone]} ${toneBorder[readinessTone]} flex flex-wrap items-center gap-3`}
      >
        <span className={`text-lg ${toneText[readinessTone]}`}>
          {health.readiness === "ready" ? "✓" : health.readiness === "partial" ? "⚠" : "⛔"}
        </span>
        <span className={`text-sm font-bold tracking-wide uppercase ${toneText[readinessTone]}`}>
          {readinessLabel}
        </span>
        {blockingIssues.length > 0 && (
          <span className="text-xs text-muted-foreground">
            due to{" "}
            {blockingIssues.map((iss, idx) => (
              <span key={iss.id}>
                <button
                  onClick={() => onNavigate({ screen: iss.screen, intent: iss.intent })}
                  className={`underline underline-offset-2 font-semibold ${toneText[iss.severity === "critical" ? "destructive" : "warning"]} hover:opacity-80`}
                >
                  {iss.title.toLowerCase()}
                </button>
                {idx < blockingIssues.length - 1 ? ", " : ""}
              </span>
            ))}
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onOpenAudit}
          title="View audit trail"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary hover:border-foreground/20 transition-colors"
        >
          <span aria-hidden>📜</span>
          Audit
          {auditCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-[1.1rem] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums">
              {auditCount > 99 ? "99+" : auditCount}
            </span>
          )}
        </button>
        <Pill tone={m2Tone}>● {health.m2_status}</Pill>
        <Pill tone={healthTone}>Data Health: {health.health_label}</Pill>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 p-5">
        {/* Left: completeness + time context */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  M2 Completeness
                </div>
                <div className={`text-4xl font-bold tabular-nums ${toneText[healthTone]}`}>
                  {health.completeness}%
                </div>
              </div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {expanded ? "Hide breakdown" : "Show breakdown"}
              </button>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-secondary overflow-hidden relative">
              <div
                className={`h-full transition-all bg-gradient-to-r ${
                  healthTone === "success"
                    ? "from-success/70 to-success"
                    : healthTone === "warning"
                      ? "from-warning/70 to-warning"
                      : "from-destructive/70 to-destructive"
                }`}
                style={{ width: `${health.completeness}%` }}
              />
            </div>
          </div>

          {/* Time context layer */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                Last Updated
              </div>
              <div className="text-xs font-mono text-foreground mt-0.5">
                {health.last_updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                Last Change
              </div>
              <div className="text-xs text-foreground mt-0.5 truncate" title={health.last_change?.what}>
                {health.last_change ? `${health.last_change.what} · ${timeAgo(health.last_change.when)}` : "No changes yet"}
              </div>
            </div>
            <div
              className={`rounded-lg border px-3 py-2 ${
                health.last_issue_detected ? "border-destructive/30 bg-destructive/5" : "border-border bg-background"
              }`}
            >
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                Last Issue Detected
              </div>
              <div
                className={`text-xs mt-0.5 ${health.last_issue_detected ? "text-destructive font-semibold" : "text-foreground"}`}
              >
                {timeAgo(health.last_issue_detected)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: completeness breakdown — clickable */}
        <div className="grid grid-cols-2 gap-2">
          {health.breakdown.map((b) => {
            const t: Tone = b.pct >= 95 ? "success" : b.pct >= 60 ? "warning" : "destructive";
            return (
              <button
                key={b.label}
                onClick={() => onBreakdownNavigate({ screen: b.screen })}
                className="text-left rounded-xl border border-border bg-background p-3 hover:shadow-md hover:border-foreground/20 transition-all group"
                title={`Open ${b.label}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {b.label}
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground">→</span>
                </div>
                <div className={`mt-1 text-xl font-bold tabular-nums ${toneText[t]}`}>{b.pct}%</div>
                <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${
                      t === "success"
                        ? "from-success/70 to-success"
                        : t === "warning"
                          ? "from-warning/70 to-warning"
                          : "from-destructive/70 to-destructive"
                    }`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded breakdown details */}
      {expanded && (
        <div className="px-5 pb-5">
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              Completeness Formula
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <div>
                <span className="font-semibold text-foreground">Materials</span>: % of active materials that have at least one routing rule.
              </div>
              <div>
                <span className="font-semibold text-foreground">Routing</span>: % of routing rules that pass validation (valid material/wc, rate &gt; 0, yield 0–100).
              </div>
              <div>
                <span className="font-semibold text-foreground">Work Centres</span>: % of work centres in <code>active</code> status.
              </div>
              <div>
                <span className="font-semibold text-foreground">Operators</span>: % of operators with both a work centre and a shift assigned.
              </div>
              <div className="pt-2 border-t border-border/60 mt-2 text-foreground">
                Overall = average of the four scores.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Audit Trail Drawer — full log of resolution & nav events
// ============================================================
function AuditTrailDrawer({
  open,
  onClose,
  entries,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  entries: AuditEntry[];
  onClear: () => void;
}) {
  if (!open) return null;

  const screenLabel = (s: M2Screen) =>
    s === "materials" ? "Materials" :
    s === "workcentres" ? "Work Centres" :
    s === "routing" ? "Routing" :
    s === "operators" ? "Operators" :
    s === "shifts" ? "Shifts" :
    s === "grades" ? "Material Grades" :
    s === "calendar" ? "Shift Calendar" :
    s === "changeover" ? "Changeover Matrix" :
    s === "csvimport" ? "CSV Import" : "Customers";

  const actionMeta: Record<AuditAction, { label: string; icon: string; tone: Tone }> = {
    "issue-resolution": { label: "Resolution attempt", icon: "🛠", tone: "destructive" },
    "filter-navigation": { label: "Filter navigation", icon: "→", tone: "info" },
    "breakdown-drill": { label: "Breakdown drill", icon: "📊", tone: "info" },
    "kpi-drill": { label: "KPI drill", icon: "📈", tone: "info" },
  };

  const handleExport = () => {
    const headers = ["timestamp", "user", "action", "source", "target_screen", "intent", "affected", "affected_label"];
    const rows = entries.map((e) => [
      e.ts.toISOString(),
      e.user,
      e.action,
      e.source,
      e.target_screen,
      e.intent_label,
      String(e.affected),
      e.affected_label,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `m2-audit-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex">
      <button
        type="button"
        aria-label="Close audit trail"
        onClick={onClose}
        className="flex-1 bg-foreground/30 backdrop-blur-sm"
      />
      <aside className="w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <span className="text-lg">📜</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground">Audit Trail</div>
            <div className="text-[11px] text-muted-foreground">
              {entries.length} event{entries.length === 1 ? "" : "s"} · session log (most recent first)
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={entries.length === 0}
            className="text-xs font-semibold rounded-md border border-border bg-background px-2.5 py-1 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export as CSV"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={entries.length === 0}
            className="text-xs font-semibold rounded-md border border-border bg-background px-2.5 py-1 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none rounded-md hover:bg-secondary w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6 text-center gap-2">
              <div className="text-4xl">🗒️</div>
              <div className="text-sm font-semibold text-foreground">No audit events yet</div>
              <div className="text-xs text-muted-foreground max-w-xs">
                Click any issue, KPI card, or completeness segment to log a resolution attempt or filter navigation here.
              </div>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {entries.map((e) => {
                const meta = actionMeta[e.action];
                return (
                  <li key={e.id} className="px-5 py-3 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-none w-8 h-8 rounded-md border ${toneBorder[meta.tone]} ${toneBg[meta.tone]} flex items-center justify-center text-sm`}
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={`text-[11px] uppercase tracking-wider font-bold ${toneText[meta.tone]}`}>
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {e.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <span className="text-[11px] text-muted-foreground">· {timeAgo(e.ts)}</span>
                        </div>
                        <div className="mt-1 text-sm text-foreground">
                          <span className="font-semibold">{e.intent_label}</span>
                          <span className="text-muted-foreground"> on </span>
                          <span className="font-semibold">{screenLabel(e.target_screen)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground">
                            <span className="text-muted-foreground">via</span> {e.source}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground tabular-nums">
                            <span className="text-muted-foreground">affects</span>
                            <span className="font-bold">{e.affected}</span>
                            {e.affected_label}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            👤 {e.user}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// Impact Drilldown — production throughput impact per issue
// Heuristic: plant baseline = active WCs × ~6 WOs/day; each issue
// blocks/risks WOs proportional to affected entities.
// ============================================================
interface ImpactRow {
  id: string;
  severity: IssueSeverity;
  title: string;
  screen: M2Screen;
  intent: NavIntent;
  blocked: number;
  atRisk: number;
  healthy: number;
  rationale: string;
  affected: { label: string; value: string }[];
}

const PLANT_WO_PER_WC_PER_DAY = 6; // baseline throughput assumption

function computeImpactRows(
  issues: Issue[],
  materials: Material[],
  workCentres: WorkCentre[],
  routing: RoutingRule[],
  operators: Operator[],
  shifts: Shift[],
): { rows: ImpactRow[]; baseline: number } {
  const activeWcs = workCentres.filter((w) => w.status === "active").length || 1;
  const baseline = activeWcs * PLANT_WO_PER_WC_PER_DAY;

  const rows: ImpactRow[] = issues.map((iss) => {
    let blocked = 0;
    let atRisk = 0;
    let rationale = "";
    let affected: { label: string; value: string }[] = [];

    if (iss.id === "missing-routing") {
      const mats = materials.filter(
        (m) => m.status === "active" && !routing.some((r) => r.material_code === m.material_code),
      );
      // Each material with no routing blocks ~2 WOs/day until routed.
      blocked = mats.length * 2;
      rationale = `${mats.length} active materials cannot be scheduled — ~2 WOs/day each blocked at planning.`;
      affected = mats.slice(0, 5).map((m) => ({ label: m.material_code, value: `${m.grade} · ${m.gauge_mm}mm` }));
    } else if (iss.id === "inactive-wc-used") {
      const utilizedIds = new Set(routing.map((r) => r.work_centre));
      const wcs = workCentres.filter((w) => w.status === "inactive" && utilizedIds.has(w.wc_id));
      // Each disabled-but-referenced WC blocks all routed WOs to it.
      blocked = wcs.reduce(
        (acc, w) => acc + new Set(routing.filter((r) => r.work_centre === w.wc_id).map((r) => r.material_code)).size,
        0,
      ) * 2;
      rationale = `${wcs.length} disabled work centres still referenced by routing — dispatch will fail.`;
      affected = wcs.map((w) => ({ label: w.wc_id, value: w.name }));
    } else if (iss.id === "unassigned-ops") {
      const ops = operators.filter((o) => !o.work_centre || !o.shift);
      // Each unassigned operator puts ~1 WO/day at risk (capacity gap, not block).
      atRisk = ops.length * 1;
      rationale = `${ops.length} operators not bound to a WC/shift — capacity gap may delay ~1 WO/day each.`;
      affected = ops.slice(0, 5).map((o) => ({
        label: o.name,
        value: `${o.skill}${o.work_centre ? "" : " · no WC"}${o.shift ? "" : " · no shift"}`,
      }));
    } else if (iss.id === "incomplete-routing") {
      const incomplete = routing.filter((r) => {
        const m = materials.find((mm) => mm.material_code === r.material_code);
        const w = workCentres.find((ww) => ww.wc_id === r.work_centre);
        if (!m || !w) return true;
        if (r.ideal_rate <= 0 || r.yield_pct <= 0 || r.yield_pct > 100) return true;
        return false;
      });
      // Bad rules degrade yield/throughput — count as at-risk, not hard block.
      atRisk = Math.ceil(incomplete.length * 1.5);
      rationale = `${incomplete.length} routing rules invalid — affected runs will under-perform vs target.`;
      affected = incomplete.slice(0, 5).map((r) => ({
        label: r.material_code,
        value: `${r.work_centre} · ${r.ideal_rate} MT/h · ${r.yield_pct}% yield`,
      }));
    }

    const healthy = Math.max(0, baseline - blocked - atRisk);
    return {
      id: iss.id,
      severity: iss.severity,
      title: iss.title,
      screen: iss.screen,
      intent: iss.intent,
      blocked,
      atRisk,
      healthy,
      rationale,
      affected,
    };
  });

  // Sort: critical first, then by total impact desc
  const SEV_ORDER: Record<IssueSeverity, number> = { critical: 0, warning: 1, info: 2 };
  rows.sort(
    (a, b) =>
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
      (b.blocked + b.atRisk) - (a.blocked + a.atRisk),
  );

  // Suppress shifts unused — silence linter
  void shifts;
  return { rows, baseline };
}

function ImpactDrilldown({
  issues,
  materials,
  workCentres,
  routing,
  operators,
  shifts,
  onNavigate,
}: {
  issues: Issue[];
  materials: Material[];
  workCentres: WorkCentre[];
  routing: RoutingRule[];
  operators: Operator[];
  shifts: Shift[];
  onNavigate: (req: M2NavRequest) => void;
}) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { rows, baseline } = useMemo(
    () => computeImpactRows(issues, materials, workCentres, routing, operators, shifts),
    [issues, materials, workCentres, routing, operators, shifts],
  );

  const totalBlocked = rows.reduce((a, r) => a + r.blocked, 0);
  const totalAtRisk = rows.reduce((a, r) => a + r.atRisk, 0);
  const safeThroughput = Math.max(0, baseline - totalBlocked - totalAtRisk);
  const lossPct = baseline === 0 ? 0 : Math.round(((totalBlocked + totalAtRisk) / baseline) * 100);

  const overallTone: Tone =
    lossPct >= 30 ? "destructive" : lossPct >= 10 ? "warning" : "success";

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-md">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex flex-wrap items-center gap-3 text-left hover:bg-secondary/40 rounded-t-2xl transition-colors"
      >
        <span className="text-base">📉</span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground">Production Impact Drilldown</div>
          <div className="text-[11px] text-muted-foreground">
            Estimated daily throughput at {baseline} WOs · {rows.length} issue{rows.length === 1 ? "" : "s"} affecting plant
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Pill tone="destructive">⛔ {totalBlocked} blocked</Pill>
          <Pill tone="warning">⚠ {totalAtRisk} at risk</Pill>
          <Pill tone="success">✓ {safeThroughput} healthy</Pill>
          <Pill tone={overallTone}>−{lossPct}% capacity</Pill>
        </div>
        <span className="text-muted-foreground text-xs ml-2">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border">
          {/* Plant-wide stacked bar */}
          <div className="mt-3 mb-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
              <span>Plant Throughput Distribution</span>
              <span className="font-mono">{baseline} WOs/day baseline</span>
            </div>
            <StackedBar blocked={totalBlocked} atRisk={totalAtRisk} healthy={safeThroughput} total={baseline} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
              <LegendDot tone="destructive" label={`Blocked ${totalBlocked}`} />
              <LegendDot tone="warning" label={`At Risk ${totalAtRisk}`} />
              <LegendDot tone="success" label={`Healthy ${safeThroughput}`} />
            </div>
          </div>

          {/* Per-issue rows */}
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const isOpen = expanded === r.id;
              const sevTone: Tone =
                r.severity === "critical" ? "destructive" : r.severity === "warning" ? "warning" : "info";
              const totalImpact = r.blocked + r.atRisk;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border ${toneBorder[sevTone]} bg-background overflow-hidden`}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`text-base ${toneText[sevTone]}`}>
                        {r.severity === "critical" ? "⛔" : r.severity === "warning" ? "⚠" : "ⓘ"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{r.rationale}</div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] tabular-nums">
                        {r.blocked > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold">
                            {r.blocked} blocked
                          </span>
                        )}
                        {r.atRisk > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning font-bold">
                            {r.atRisk} at risk
                          </span>
                        )}
                        <span className="text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
                      </div>
                    </div>
                    {/* Per-issue mini stacked bar */}
                    <div className="mt-2.5">
                      <StackedBar
                        blocked={r.blocked}
                        atRisk={r.atRisk}
                        healthy={Math.max(0, baseline - r.blocked - r.atRisk)}
                        total={baseline}
                        thin
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-border bg-secondary/20">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <ImpactStat
                          label="WOs Blocked"
                          value={r.blocked}
                          tone="destructive"
                          help="Cannot run until master data is fixed."
                        />
                        <ImpactStat
                          label="WOs At Risk"
                          value={r.atRisk}
                          tone="warning"
                          help="Will run but under-perform target throughput."
                        />
                        <ImpactStat
                          label="Capacity Loss"
                          value={baseline === 0 ? 0 : Math.round((totalImpact / baseline) * 100)}
                          tone={totalImpact > 0 ? sevTone : "success"}
                          suffix="%"
                          help="Share of plant baseline throughput affected."
                        />
                      </div>

                      {r.affected.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
                            Top affected entities
                          </div>
                          <ul className="rounded-lg border border-border bg-background divide-y divide-border">
                            {r.affected.map((a) => (
                              <li
                                key={a.label}
                                className="px-3 py-1.5 flex items-center gap-3 text-xs"
                              >
                                <span className="font-mono font-semibold text-foreground truncate flex-1">
                                  {a.label}
                                </span>
                                <span className="text-muted-foreground truncate">{a.value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onNavigate({ screen: r.screen, intent: r.intent })}
                          className={`text-xs font-bold rounded-md px-3 py-1.5 border ${toneBorder[sevTone]} ${toneBg[sevTone]} ${toneText[sevTone]} hover:opacity-80 transition-opacity`}
                        >
                          Resolve in {r.screen} →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[10px] text-muted-foreground italic">
            Estimates use a heuristic baseline of {PLANT_WO_PER_WC_PER_DAY} WOs/day per active work centre. Wire to M1/M6 actual throughput for live numbers.
          </div>
        </div>
      )}
    </div>
  );
}

function StackedBar({
  blocked,
  atRisk,
  healthy,
  total,
  thin = false,
}: {
  blocked: number;
  atRisk: number;
  healthy: number;
  total: number;
  thin?: boolean;
}) {
  const safeTotal = Math.max(1, total);
  const bPct = (blocked / safeTotal) * 100;
  const rPct = (atRisk / safeTotal) * 100;
  const hPct = Math.max(0, 100 - bPct - rPct);
  const h = thin ? "h-1.5" : "h-3";
  return (
    <div className={`w-full ${h} rounded-full overflow-hidden bg-secondary flex`}>
      {bPct > 0 && (
        <div
          className="h-full bg-gradient-to-r from-destructive/80 to-destructive"
          style={{ width: `${bPct}%` }}
          title={`Blocked ${blocked}`}
        />
      )}
      {rPct > 0 && (
        <div
          className="h-full bg-gradient-to-r from-warning/70 to-warning"
          style={{ width: `${rPct}%` }}
          title={`At risk ${atRisk}`}
        />
      )}
      {hPct > 0 && (
        <div
          className="h-full bg-gradient-to-r from-success/60 to-success"
          style={{ width: `${hPct}%` }}
          title={`Healthy ${healthy}`}
        />
      )}
    </div>
  );
}

function LegendDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${toneRail[tone]}`} />
      {label}
    </span>
  );
}

function ImpactStat({
  label,
  value,
  tone,
  suffix,
  help,
}: {
  label: string;
  value: number;
  tone: Tone;
  suffix?: string;
  help?: string;
}) {
  return (
    <div className={`rounded-lg border ${toneBorder[tone]} ${toneBg[tone]} px-3 py-2`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </div>
      <div className={`text-xl font-bold tabular-nums ${toneText[tone]}`}>
        {value}
        {suffix ?? ""}
      </div>
      {help && <div className="text-[10px] text-muted-foreground mt-0.5">{help}</div>}
    </div>
  );
}

// ============================================================
// Global Data Health Strip — actionable, prioritized issues
// ============================================================
function DataHealthStrip({
  issues,
  onNavigate,
}: {
  issues: Issue[];
  onNavigate: (req: M2NavRequest) => void;
}) {
  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 flex items-center gap-3 shadow-sm">
        <span className="text-success text-lg">✓</span>
        <span className="text-sm font-semibold text-success">
          All master data is healthy — no issues detected.
        </span>
      </div>
    );
  }

  const sevTone: Record<IssueSeverity, Tone> = {
    critical: "destructive",
    warning: "warning",
    info: "info",
  };
  const sevLabel: Record<IssueSeverity, string> = {
    critical: "CRITICAL",
    warning: "WARNING",
    info: "INFO",
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/50 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Data Health · {issues.length} issue{issues.length > 1 ? "s" : ""} detected · click to resolve
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[10px]">
          {(["critical", "warning", "info"] as IssueSeverity[]).map((s) => {
            const n = issues.filter((i) => i.severity === s).length;
            if (n === 0) return null;
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${toneBg[sevTone[s]]} ${toneText[sevTone[s]]} ${toneBorder[sevTone[s]]} border`}
              >
                {n} {sevLabel[s]}
              </span>
            );
          })}
        </div>
      </div>
      <div className="divide-y divide-border">
        {issues.map((iss) => {
          const tone = sevTone[iss.severity];
          return (
            <button
              key={iss.id}
              onClick={() => onNavigate({ screen: iss.screen, intent: iss.intent })}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:${toneBg[tone]} group`}
              title="Open affected records"
            >
              <span
                className={`shrink-0 mt-0.5 inline-flex items-center justify-center h-7 w-7 rounded-md ${toneBg[tone]} ${toneText[tone]} ${toneBorder[tone]} border text-base`}
              >
                {iss.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded ${toneBg[tone]} ${toneText[tone]}`}
                  >
                    {sevLabel[iss.severity]}
                  </span>
                  <span className={`text-sm font-semibold ${toneText[tone]}`}>{iss.title}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{iss.impact}</div>
              </div>
              <span className="shrink-0 self-center text-muted-foreground group-hover:text-foreground transition-colors">
                Resolve →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// KPI Strip primitives — interactive
// ============================================================
interface KpiCard {
  label: string;
  value: string | number;
  tone: Tone;
  sub?: string;
  onClick?: () => void;
  highlight?: boolean;
}

function KpiStrip({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const interactive = !!c.onClick;
        const Comp = interactive ? "button" : "div";
        return (
          <Comp
            key={c.label}
            {...(interactive ? { onClick: c.onClick, type: "button" as const } : {})}
            className={`relative overflow-hidden rounded-xl border bg-card px-4 py-3 shadow-sm text-left transition-all ${
              interactive ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""
            } ${c.highlight ? `${toneBorder[c.tone]} ${toneBg[c.tone]}` : "border-border"}`}
            title={interactive ? `Open ${c.label}` : undefined}
          >
            <div className={`absolute inset-y-0 left-0 w-1 ${toneRail[c.tone]}`} />
            <div className="flex items-start justify-between">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {c.label}
              </div>
              {interactive && (
                <span className="text-[10px] text-muted-foreground">→</span>
              )}
            </div>
            <div className={`mt-0.5 text-2xl font-bold tabular-nums ${toneText[c.tone]}`}>
              {c.value}
            </div>
            {c.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>}
          </Comp>
        );
      })}
    </div>
  );
}

function MaterialsKpi({
  materials,
  relations,
  onNavigate,
}: {
  materials: Material[];
  relations: Record<string, { wcs: string[]; configured: boolean }>;
  onNavigate: (req: M2NavRequest) => void;
}) {
  const total = materials.length;
  const active = materials.filter((m) => m.status === "active").length;
  const withRouting = materials.filter(
    (m) => m.status === "active" && relations[m.material_code]?.configured,
  ).length;
  const missing = active - withRouting;
  return (
    <KpiStrip
      cards={[
        {
          label: "Total",
          value: total,
          tone: "info",
          onClick: () => onNavigate({ screen: "materials", intent: { kind: "filter-all" } }),
        },
        {
          label: "Active",
          value: active,
          tone: "success",
          onClick: () =>
            onNavigate({ screen: "materials", intent: { kind: "filter-status", status: "active" } }),
        },
        {
          label: "With Routing",
          value: withRouting,
          tone: "purple",
          onClick: () =>
            onNavigate({ screen: "materials", intent: { kind: "filter-routing", routing: "configured" } }),
        },
        {
          label: "Missing Routing",
          value: missing,
          tone: missing > 0 ? "destructive" : "muted",
          highlight: missing > 0,
          onClick: () =>
            onNavigate({ screen: "materials", intent: { kind: "filter-routing", routing: "missing" } }),
        },
      ]}
    />
  );
}

function WorkCentresKpi({
  workCentres,
  relations,
  onNavigate,
}: {
  workCentres: WorkCentre[];
  relations: Record<string, { mats: number; ops: number; utilized: boolean }>;
  onNavigate: (req: M2NavRequest) => void;
}) {
  const total = workCentres.length;
  const active = workCentres.filter((w) => w.status === "active").length;
  const utilized = workCentres.filter((w) => relations[w.wc_id]?.utilized).length;
  const idle = active - utilized;
  return (
    <KpiStrip
      cards={[
        {
          label: "Total",
          value: total,
          tone: "info",
          onClick: () => onNavigate({ screen: "workcentres", intent: { kind: "filter-all" } }),
        },
        {
          label: "Active",
          value: active,
          tone: "success",
          onClick: () =>
            onNavigate({ screen: "workcentres", intent: { kind: "filter-status", status: "active" } }),
        },
        {
          label: "Utilized",
          value: utilized,
          tone: "purple",
          onClick: () =>
            onNavigate({ screen: "workcentres", intent: { kind: "filter-wc-utilized", utilized: true } }),
        },
        {
          label: "Idle",
          value: idle,
          tone: idle > 0 ? "warning" : "muted",
          highlight: idle > 0,
          onClick: () =>
            onNavigate({ screen: "workcentres", intent: { kind: "filter-wc-utilized", utilized: false } }),
        },
      ]}
    />
  );
}

function OperatorsKpi({
  operators,
  onNavigate,
}: {
  operators: Operator[];
  onNavigate: (req: M2NavRequest) => void;
}) {
  const total = operators.length;
  const assigned = operators.filter((o) => o.work_centre && o.shift).length;
  const unassigned = total - assigned;
  const active = operators.filter((o) => o.status === "active").length;
  return (
    <KpiStrip
      cards={[
        {
          label: "Total",
          value: total,
          tone: "info",
          onClick: () => onNavigate({ screen: "operators", intent: { kind: "filter-all" } }),
        },
        {
          label: "Assigned",
          value: assigned,
          tone: "success",
          onClick: () =>
            onNavigate({ screen: "operators", intent: { kind: "filter-assignment", assign: "assigned" } }),
        },
        {
          label: "Unassigned",
          value: unassigned,
          tone: unassigned > 0 ? "destructive" : "muted",
          highlight: unassigned > 0,
          onClick: () =>
            onNavigate({ screen: "operators", intent: { kind: "filter-assignment", assign: "unassigned" } }),
        },
        {
          label: "Active",
          value: active,
          tone: "purple",
          onClick: () =>
            onNavigate({ screen: "operators", intent: { kind: "filter-all" } }),
        },
      ]}
    />
  );
}

function RoutingKpi({
  routing,
  materials,
  workCentres,
  onNavigate,
}: {
  routing: RoutingRule[];
  materials: Material[];
  workCentres: WorkCentre[];
  onNavigate: (req: M2NavRequest) => void;
}) {
  const total = routing.length;
  const complete = routing.filter((r) => {
    const m = materials.find((mm) => mm.material_code === r.material_code);
    const w = workCentres.find((ww) => ww.wc_id === r.work_centre);
    return m && w && r.ideal_rate > 0 && r.yield_pct > 0 && r.yield_pct <= 100;
  }).length;
  const missing = total - complete;
  const activeMats = materials.filter((m) => m.status === "active").length;
  const matsWithRouting = new Set(
    routing.map((r) => r.material_code).filter((c) => materials.find((mm) => mm.material_code === c && mm.status === "active")),
  ).size;
  const coverage = activeMats === 0 ? 0 : Math.round((matsWithRouting / activeMats) * 100);
  return (
    <KpiStrip
      cards={[
        {
          label: "Total Rules",
          value: total,
          tone: "info",
          onClick: () => onNavigate({ screen: "routing", intent: { kind: "filter-all" } }),
        },
        {
          label: "Complete",
          value: complete,
          tone: "success",
        },
        {
          label: "Incomplete",
          value: missing,
          tone: missing > 0 ? "destructive" : "muted",
          highlight: missing > 0,
          onClick: () => onNavigate({ screen: "routing", intent: { kind: "incomplete-routing" } }),
        },
        {
          label: "Coverage",
          value: `${coverage}%`,
          tone: coverage >= 80 ? "success" : "warning",
          sub: `${matsWithRouting}/${activeMats} active mats`,
          onClick: () =>
            onNavigate({ screen: "materials", intent: { kind: "filter-routing", routing: "missing" } }),
        },
      ]}
    />
  );
}

// ============================================================
// Shared layout primitives
// ============================================================
// Lightweight CSV parser — handles quoted fields, commas in quotes, escaped quotes.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        cur.push(field);
        field = "";
      } else if (ch === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

function ScreenShell({
  title,
  subtitle,
  search,
  onSearch,
  onAdd,
  filters,
  children,
  onImportRows,
  csvTemplate,
  entityLabel,
}: {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (v: string) => void;
  onAdd: () => void;
  filters?: React.ReactNode;
  children: React.ReactNode;
  onImportRows?: (rows: Record<string, string>[]) => { added: number; skipped: number };
  csvTemplate?: string;
  entityLabel?: string;
}) {
  const [editMode, setEditMode] = useState(false);
  const fileInputId = `csv-${title.replace(/\s+/g, "-").toLowerCase()}`;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const rows = parseCsv(text);
        if (rows.length === 0) {
          alert("CSV is empty or has no data rows.");
          return;
        }
        if (onImportRows) {
          const result = onImportRows(rows);
          alert(
            `Imported ${result.added} ${entityLabel ?? "row"}${result.added === 1 ? "" : "s"}` +
              (result.skipped > 0 ? ` · ${result.skipped} skipped (duplicate or invalid)` : ""),
          );
        } else {
          alert(`Parsed ${rows.length} rows but no import handler is wired for this screen yet.`);
        }
      } catch (err) {
        alert("Failed to parse CSV: " + (err instanceof Error ? err.message : "unknown error"));
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    if (!csvTemplate) return;
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(entityLabel ?? "template").replace(/\s+/g, "_").toLowerCase()}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search…"
            className="h-9 w-60 rounded-full border border-border bg-secondary/60 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        {filters}

        {/* Edit-mode toggle — always visible */}
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`h-9 inline-flex items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
            editMode
              ? "bg-warning/15 border-warning/40 text-warning hover:bg-warning/25"
              : "bg-background border-border text-foreground hover:bg-secondary"
          }`}
          title={editMode ? "Exit edit mode" : "Enter edit mode to add or import data"}
        >
          {editMode ? "✎ Editing · Done" : "✎ Edit"}
        </button>

        {/* Add + Import — only visible in edit mode */}
        {editMode && (
          <>
            {csvTemplate && (
              <button
                onClick={downloadTemplate}
                className="h-9 inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Download CSV template with required headers"
              >
                ⇩ Template
              </button>
            )}
            <input
              id={fileInputId}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor={fileInputId}
              className="h-9 inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Import master data from CSV"
            >
              ⇪ Import CSV
            </label>
            <button
              onClick={onAdd}
              className="h-9 inline-flex items-center gap-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              + Add New
            </button>
          </>
        )}
      </div>
      {editMode && (
        <div className="px-5 py-2 bg-warning/10 border-b border-warning/30 text-[11px] text-warning font-medium tracking-wide uppercase">
          Edit mode active — Add New &amp; Import CSV are unlocked. Click "Done" to lock the table.
        </div>
      )}
      {children}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 border-b border-border ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}

function RowActions({
  onView,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
  active,
}: {
  onView?: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onToggle?: () => void;
  onDelete: () => void;
  active?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {onView && (
        <button
          onClick={onView}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-info hover:bg-info/10"
          title="View details"
          aria-label="View"
        >
          ◉
        </button>
      )}
      <button
        onClick={onEdit}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
        title="Edit"
        aria-label="Edit"
      >
        ✎
      </button>
      {onDuplicate && (
        <button
          onClick={onDuplicate}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-purple hover:bg-purple/10"
          title="Duplicate row"
          aria-label="Duplicate"
        >
          ⎘
        </button>
      )}
      {onToggle && (
        <button
          onClick={onToggle}
          className={`h-8 w-8 inline-flex items-center justify-center rounded-md border ${
            active
              ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
              : "border-success/40 bg-success/10 text-success hover:bg-success/20"
          }`}
          title={active ? "Disable" : "Enable"}
          aria-label="Toggle status"
        >
          {active ? "⏻" : "✓"}
        </button>
      )}
      <button
        onClick={onDelete}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
        title="Delete"
        aria-label="Delete"
      >
        🗑
      </button>
    </div>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-md h-full bg-card border-l border-border shadow-xl flex flex-col">
        <div className="px-5 h-14 flex items-center justify-between border-b border-border">
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold tracking-tight">{title}</h3>
        </div>
        <div className="px-5 py-4 text-sm text-muted-foreground">{message}</div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-9 px-4 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Form primitives ----------------
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        {label}
      </div>
      {children}
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

function Toggle({ value, onChange }: { value: ActiveStatus; onChange: (v: ActiveStatus) => void }) {
  const active = value === "active";
  return (
    <button
      type="button"
      onClick={() => onChange(active ? "inactive" : "active")}
      className={`inline-flex items-center gap-2 h-10 px-3 rounded-md border ${
        active ? "border-success/40 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? "bg-success" : "bg-destructive"}`} />
      <span className="text-sm font-semibold uppercase tracking-wider">{value}</span>
    </button>
  );
}

function FilterChip<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | "all";
  options: { value: T; label: string }[];
  onChange: (v: T | "all") => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <div className="inline-flex rounded-full border border-border bg-secondary/50 p-0.5">
        <button
          onClick={() => onChange("all")}
          className={`px-2.5 h-7 rounded-full text-xs font-semibold ${
            value === "all" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2.5 h-7 rounded-full text-xs font-semibold ${
              value === o.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 1. Materials Screen
// ============================================================
function MaterialsScreen({
  rows,
  setRows,
  relations,
  initialIntent,
}: {
  rows: Material[];
  setRows: React.Dispatch<React.SetStateAction<Material[]>>;
  relations: Record<string, { wcs: string[]; configured: boolean }>;
  initialIntent?: NavIntent;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MaterialType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ActiveStatus | "all">("all");
  const [routingFilter, setRoutingFilter] = useState<"configured" | "missing" | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  // Apply incoming intent from dashboard navigation
  useEffect(() => {
    if (!initialIntent) return;
    if (initialIntent.kind === "filter-routing") {
      setRoutingFilter(initialIntent.routing);
      setStatusFilter("active");
    } else if (initialIntent.kind === "filter-status") {
      setStatusFilter(initialIntent.status);
    } else if (initialIntent.kind === "filter-all") {
      setRoutingFilter("all");
      setStatusFilter("all");
      setTypeFilter("all");
    } else if (initialIntent.kind === "missing-routing") {
      setRoutingFilter("missing");
      setStatusFilter("active");
    }
  }, [initialIntent]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.material_code.toLowerCase().includes(q) && !r.grade.toLowerCase().includes(q))
        return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (routingFilter !== "all") {
        const cfg = relations[r.material_code]?.configured ?? false;
        if (routingFilter === "configured" && !cfg) return false;
        if (routingFilter === "missing" && cfg) return false;
      }
      return true;
    });
  }, [rows, search, typeFilter, statusFilter, routingFilter, relations]);

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (m: Material) => {
    setEditing(m);
    setDrawerOpen(true);
  };
  const handleSave = (m: Material) => {
    setRows((prev) => {
      if (editing) return prev.map((p) => (p.material_code === editing.material_code ? m : p));
      if (prev.some((p) => p.material_code === m.material_code)) return prev;
      return [m, ...prev];
    });
    setDrawerOpen(false);
  };
  const handleDelete = () => {
    if (!confirm) return;
    setRows((prev) => prev.filter((p) => p.material_code !== confirm));
    setConfirm(null);
  };
  const duplicate = (m: Material) => {
    const newCode = `${m.material_code}-COPY`;
    setRows((prev) =>
      prev.some((p) => p.material_code === newCode) ? prev : [{ ...m, material_code: newCode }, ...prev],
    );
  };
  const toggleStatus = (code: string) => {
    setRows((prev) =>
      prev.map((p) =>
        p.material_code === code
          ? { ...p, status: p.status === "active" ? "inactive" : "active" }
          : p,
      ),
    );
  };

  return (
    <>
      <ScreenShell
        title="Materials Master"
        subtitle={`${rows.length} materials · ${rows.filter((r) => r.status === "active").length} active`}
        search={search}
        onSearch={setSearch}
        onAdd={openAdd}
        entityLabel="material"
        csvTemplate={"material_code,grade,gauge_mm,width_mm,type,status\nHR-EXAMPLE-050-1250,IS513-D,0.50,1250,HR,active\n"}
        onImportRows={(csvRows) => {
          let added = 0;
          let skipped = 0;
          const existing = new Set(rows.map((r) => r.material_code));
          const next: Material[] = [];
          for (const r of csvRows) {
            const code = (r.material_code || "").trim();
            const grade = (r.grade || "").trim();
            const gauge = parseFloat(r.gauge_mm);
            const width = parseFloat(r.width_mm);
            const type = (r.type || "").toUpperCase() as MaterialType;
            const status: ActiveStatus =
              (r.status || "active").toLowerCase() === "inactive" ? "inactive" : "active";
            if (
              !code ||
              !grade ||
              isNaN(gauge) ||
              isNaN(width) ||
              !["HR", "CR", "FG"].includes(type) ||
              existing.has(code)
            ) {
              skipped++;
              continue;
            }
            existing.add(code);
            next.push({ material_code: code, grade, gauge_mm: gauge, width_mm: width, type, status });
            added++;
          }
          if (added > 0) setRows((prev) => [...prev, ...next]);
          return { added, skipped };
        }}
        filters={
          <>
            <FilterChip
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "HR", label: "HR" },
                { value: "CR", label: "CR" },
                { value: "FG", label: "FG" },
              ]}
            />
            <FilterChip
              label="Routing"
              value={routingFilter}
              onChange={setRoutingFilter}
              options={[
                { value: "configured", label: "Configured" },
                { value: "missing", label: "Missing" },
              ]}
            />
            <FilterChip
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/40">
              <tr>
                <Th>Material Code</Th>
                <Th>Grade</Th>
                <Th className="text-right">Gauge</Th>
                <Th className="text-right">Width</Th>
                <Th>Type</Th>
                <Th>Routing</Th>
                <Th>Work Centres Used</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const rel = relations[m.material_code];
                const missing = m.status === "active" && !rel?.configured;
                return (
                  <tr
                    key={m.material_code}
                    onClick={() => openEdit(m)}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      missing ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-secondary/40"
                    }`}
                  >
                    <Td className="font-mono text-xs">{m.material_code}</Td>
                    <Td className="font-semibold">{m.grade}</Td>
                    <Td className="text-right tabular-nums">{m.gauge_mm.toFixed(2)}</Td>
                    <Td className="text-right tabular-nums">{m.width_mm}</Td>
                    <Td>
                      <Pill tone={TYPE_TONE[m.type]}>{m.type}</Pill>
                    </Td>
                    <Td>
                      {rel?.configured ? (
                        <Pill tone="success">configured</Pill>
                      ) : (
                        <Pill tone="destructive">missing</Pill>
                      )}
                    </Td>
                    <Td>
                      {rel?.wcs.length ? (
                        <div className="flex flex-wrap gap-1">
                          {rel.wcs.map((w) => (
                            <span
                              key={w}
                              className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-secondary/60 text-foreground"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusPill s={m.status} />
                    </Td>
                    <Td className="text-right">
                      <RowActions
                        onView={() => openEdit(m)}
                        onEdit={() => openEdit(m)}
                        onDuplicate={() => duplicate(m)}
                        onToggle={() => toggleStatus(m.material_code)}
                        active={m.status === "active"}
                        onDelete={() => setConfirm(m.material_code)}
                      />
                    </Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No materials match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScreenShell>

      <Drawer
        open={drawerOpen}
        title={editing ? "Edit Material" : "Add Material"}
        onClose={() => setDrawerOpen(false)}
      >
        <MaterialForm
          initial={editing}
          relation={editing ? relations[editing.material_code] : undefined}
          onCancel={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        title="Delete material?"
        message={`This will remove ${confirm} from the master. This cannot be undone.`}
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

function MaterialForm({
  initial,
  relation,
  onCancel,
  onSave,
}: {
  initial: Material | null;
  relation?: { wcs: string[]; configured: boolean };
  onCancel: () => void;
  onSave: (m: Material) => void;
}) {
  const [code, setCode] = useState(initial?.material_code ?? "");
  const [grade, setGrade] = useState(initial?.grade ?? "");
  const [gauge, setGauge] = useState<string>(initial ? String(initial.gauge_mm) : "");
  const [width, setWidth] = useState<string>(initial ? String(initial.width_mm) : "");
  const [type, setType] = useState<MaterialType>(initial?.type ?? "HR");
  const [status, setStatus] = useState<ActiveStatus>(initial?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!code.trim()) e.code = "Material code is required";
    if (!grade.trim()) e.grade = "Grade is required";
    const gN = Number(gauge);
    const wN = Number(width);
    if (!gauge || Number.isNaN(gN) || gN <= 0) e.gauge = "Gauge must be a positive number";
    if (!width || Number.isNaN(wN) || wN <= 0) e.width = "Width must be a positive number";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave({
      material_code: code.trim(),
      grade: grade.trim(),
      gauge_mm: gN,
      width_mm: wN,
      type,
      status,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-4">
        {initial && relation && (
          <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                Routing Status
              </span>
              {relation.configured ? (
                <Pill tone="success">configured</Pill>
              ) : (
                <Pill tone="destructive">missing</Pill>
              )}
            </div>
            <div className="text-muted-foreground">
              {relation.wcs.length
                ? `Used on: ${relation.wcs.join(", ")}`
                : "No work centres mapped — add a routing rule."}
            </div>
          </div>
        )}
        <Field label="Material Code" error={errors.code}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!!initial}
            className={`${inputCls} ${initial ? "opacity-60 cursor-not-allowed" : ""} font-mono`}
            placeholder="HR-IS513-D-045-1250"
          />
        </Field>
        <Field label="Grade" error={errors.grade}>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className={inputCls}
            placeholder="IS513-D"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gauge (mm)" error={errors.gauge}>
            <input
              type="number"
              step="0.01"
              value={gauge}
              onChange={(e) => setGauge(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Width (mm)" error={errors.width}>
            <input
              type="number"
              step="1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as MaterialType)} className={inputCls}>
            <option value="HR">HR — Hot Rolled</option>
            <option value="CR">CR — Cold Rolled</option>
            <option value="FG">FG — Finished Goods</option>
          </select>
        </Field>
        <Field label="Status">
          <Toggle value={status} onChange={setStatus} />
        </Field>
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-secondary/30">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 2. Customers Screen
// ============================================================
function CustomersScreen({
  rows,
  setRows,
}: {
  rows: Customer[];
  setRows: React.Dispatch<React.SetStateAction<Customer[]>>;
}) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      return true;
    });
  }, [rows, search, priorityFilter]);

  const openEdit = (c: Customer) => {
    setEditing(c);
    setDrawerOpen(true);
  };
  const handleSave = (name: string, priority: Priority, status: ActiveStatus) => {
    if (editing) {
      setRows((prev) =>
        prev.map((p) => (p.customer_id === editing.customer_id ? { ...editing, name, priority, status } : p)),
      );
    } else {
      const next = `C-${1000 + rows.length + 1}`;
      setRows((prev) => [{ customer_id: next, name, priority, status }, ...prev]);
    }
    setDrawerOpen(false);
  };
  const duplicate = (c: Customer) => {
    const next = `C-${1000 + rows.length + 1}`;
    setRows((prev) => [{ ...c, customer_id: next, name: `${c.name} (Copy)` }, ...prev]);
  };
  const toggleStatus = (id: string) =>
    setRows((prev) =>
      prev.map((p) => (p.customer_id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p)),
    );

  return (
    <>
      <ScreenShell
        title="Customer Master"
        subtitle={`${rows.length} customers`}
        search={search}
        onSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
        entityLabel="customer"
        csvTemplate={"customer_id,name,priority,status\nC-1100,Example Motors,medium,active\n"}
        onImportRows={(csvRows) => {
          let added = 0;
          let skipped = 0;
          const existing = new Set(rows.map((r) => r.customer_id));
          let nextId = rows.length + 1;
          const next: Customer[] = [];
          for (const r of csvRows) {
            const name = (r.name || "").trim();
            const pr = (r.priority || "medium").toLowerCase();
            const priority: Priority = pr === "high" || pr === "low" ? pr : "medium";
            const status: ActiveStatus =
              (r.status || "active").toLowerCase() === "inactive" ? "inactive" : "active";
            let id = (r.customer_id || "").trim();
            if (!name) {
              skipped++;
              continue;
            }
            if (!id) id = `C-${1000 + nextId++}`;
            if (existing.has(id)) {
              skipped++;
              continue;
            }
            existing.add(id);
            next.push({ customer_id: id, name, priority, status });
            added++;
          }
          if (added > 0) setRows((prev) => [...prev, ...next]);
          return { added, skipped };
        }}
        filters={
          <FilterChip
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/40">
              <tr>
                <Th>Customer ID</Th>
                <Th>Customer Name</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.customer_id}
                  onClick={() => openEdit(c)}
                  className="border-b border-border hover:bg-secondary/40 cursor-pointer"
                >
                  <Td className="font-mono text-xs">{c.customer_id}</Td>
                  <Td className="font-semibold">{c.name}</Td>
                  <Td>
                    <Pill tone={PRIORITY_TONE[c.priority]}>{c.priority}</Pill>
                  </Td>
                  <Td>
                    <StatusPill s={c.status} />
                  </Td>
                  <Td className="text-right">
                    <RowActions
                      onView={() => openEdit(c)}
                      onEdit={() => openEdit(c)}
                      onDuplicate={() => duplicate(c)}
                      onToggle={() => toggleStatus(c.customer_id)}
                      active={c.status === "active"}
                      onDelete={() => setConfirm(c.customer_id)}
                    />
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No customers match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScreenShell>

      <Drawer
        open={drawerOpen}
        title={editing ? "Edit Customer" : "Add Customer"}
        onClose={() => setDrawerOpen(false)}
      >
        <CustomerForm initial={editing} onCancel={() => setDrawerOpen(false)} onSave={handleSave} />
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        title="Delete customer?"
        message={`This will remove customer ${confirm}.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setRows((prev) => prev.filter((p) => p.customer_id !== confirm));
          setConfirm(null);
        }}
      />
    </>
  );
}

function CustomerForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: Customer | null;
  onCancel: () => void;
  onSave: (name: string, priority: Priority, status: ActiveStatus) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [status, setStatus] = useState<ActiveStatus>(initial?.status ?? "active");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("Customer name is required");
      return;
    }
    onSave(name.trim(), priority, status);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-4">
        <Field label="Customer Name" error={error}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputCls}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="Status">
          <Toggle value={status} onChange={setStatus} />
        </Field>
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-secondary/30">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 3. Work Centres
// ============================================================
function WorkCentresScreen({
  rows,
  setRows,
  relations,
  initialIntent,
}: {
  rows: WorkCentre[];
  setRows: React.Dispatch<React.SetStateAction<WorkCentre[]>>;
  relations: Record<string, { mats: number; ops: number; utilized: boolean }>;
  initialIntent?: NavIntent;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActiveStatus | "all">("all");
  const [utilFilter, setUtilFilter] = useState<"utilized" | "idle" | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WorkCentre | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!initialIntent) return;
    if (initialIntent.kind === "filter-status") {
      setStatusFilter(initialIntent.status);
      setUtilFilter("all");
    } else if (initialIntent.kind === "filter-wc-utilized") {
      setUtilFilter(initialIntent.utilized ? "utilized" : "idle");
      setStatusFilter("all");
    } else if (initialIntent.kind === "inactive-wc-used") {
      setStatusFilter("inactive");
      setUtilFilter("utilized");
    } else if (initialIntent.kind === "filter-all") {
      setStatusFilter("all");
      setUtilFilter("all");
    }
  }, [initialIntent]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.wc_id.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (utilFilter !== "all") {
        const util = relations[r.wc_id]?.utilized ?? false;
        if (utilFilter === "utilized" && !util) return false;
        if (utilFilter === "idle" && util) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, utilFilter, relations]);

  const openEdit = (w: WorkCentre) => {
    setEditing(w);
    setDrawerOpen(true);
  };
  const handleSave = (wc: WorkCentre) => {
    if (editing) setRows((prev) => prev.map((p) => (p.wc_id === editing.wc_id ? wc : p)));
    else if (!rows.some((r) => r.wc_id === wc.wc_id)) setRows((prev) => [wc, ...prev]);
    setDrawerOpen(false);
  };
  const toggleStatus = (id: string) => {
    setRows((prev) =>
      prev.map((p) => (p.wc_id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p)),
    );
  };
  const duplicate = (w: WorkCentre) => {
    const newId = `${w.wc_id}-COPY`;
    setRows((prev) =>
      prev.some((p) => p.wc_id === newId) ? prev : [{ ...w, wc_id: newId }, ...prev],
    );
  };

  return (
    <>
      <ScreenShell
        title="Work Centres"
        subtitle={`${rows.length} centres · ${rows.filter((r) => r.status === "active").length} active`}
        search={search}
        onSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
        entityLabel="work centre"
        csvTemplate={"wc_id,name,type,status\nCRS-4,Cold Rolling Stand 4,Rolling,active\n"}
        onImportRows={(csvRows) => {
          let added = 0;
          let skipped = 0;
          const existing = new Set(rows.map((r) => r.wc_id));
          const next: WorkCentre[] = [];
          for (const r of csvRows) {
            const wc_id = (r.wc_id || "").trim();
            const name = (r.name || "").trim();
            const typeRaw = (r.type || "").trim();
            const type: WCType = typeRaw === "Processing" ? "Processing" : "Rolling";
            const status: ActiveStatus =
              (r.status || "active").toLowerCase() === "inactive" ? "inactive" : "active";
            if (!wc_id || !name || existing.has(wc_id)) {
              skipped++;
              continue;
            }
            existing.add(wc_id);
            next.push({ wc_id, name, type, status });
            added++;
          }
          if (added > 0) setRows((prev) => [...prev, ...next]);
          return { added, skipped };
        }}
        filters={
          <>
            <FilterChip
              label="Utilization"
              value={utilFilter}
              onChange={setUtilFilter}
              options={[
                { value: "utilized", label: "Utilized" },
                { value: "idle", label: "Idle" },
              ]}
            />
            <FilterChip
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/40">
              <tr>
                <Th>WC ID</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th className="text-right">Materials</Th>
                <Th className="text-right">Operators</Th>
                <Th>Utilization</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const rel = relations[w.wc_id];
                const inactiveButUsed = w.status === "inactive" && rel?.utilized;
                return (
                  <tr
                    key={w.wc_id}
                    onClick={() => openEdit(w)}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      inactiveButUsed ? "bg-warning/10 hover:bg-warning/15" : "hover:bg-secondary/40"
                    }`}
                  >
                    <Td className="font-mono text-xs font-semibold">{w.wc_id}</Td>
                    <Td>{w.name}</Td>
                    <Td>
                      <Pill tone={w.type === "Rolling" ? "purple" : "info"}>{w.type}</Pill>
                    </Td>
                    <Td className="text-right tabular-nums font-semibold">{rel?.mats ?? 0}</Td>
                    <Td className="text-right tabular-nums font-semibold">{rel?.ops ?? 0}</Td>
                    <Td>
                      {rel?.utilized ? (
                        <Pill tone="success">in use</Pill>
                      ) : (
                        <Pill tone="muted">idle</Pill>
                      )}
                    </Td>
                    <Td>
                      <StatusPill s={w.status} />
                    </Td>
                    <Td className="text-right">
                      <RowActions
                        onView={() => openEdit(w)}
                        onEdit={() => openEdit(w)}
                        onDuplicate={() => duplicate(w)}
                        onToggle={() => toggleStatus(w.wc_id)}
                        active={w.status === "active"}
                        onDelete={() => setConfirm(w.wc_id)}
                      />
                    </Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No work centres found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScreenShell>

      <Drawer
        open={drawerOpen}
        title={editing ? "Edit Work Centre" : "Add Work Centre"}
        onClose={() => setDrawerOpen(false)}
      >
        <WorkCentreForm
          initial={editing}
          relation={editing ? relations[editing.wc_id] : undefined}
          onCancel={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        title="Delete work centre?"
        message={`This will remove ${confirm}. Routing rules referencing it may break.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setRows((prev) => prev.filter((p) => p.wc_id !== confirm));
          setConfirm(null);
        }}
      />
    </>
  );
}

function WorkCentreForm({
  initial,
  relation,
  onCancel,
  onSave,
}: {
  initial: WorkCentre | null;
  relation?: { mats: number; ops: number; utilized: boolean };
  onCancel: () => void;
  onSave: (w: WorkCentre) => void;
}) {
  const [wcId, setWcId] = useState(initial?.wc_id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<WCType>(initial?.type ?? "Rolling");
  const [status, setStatus] = useState<ActiveStatus>(initial?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!wcId.trim()) e.wcId = "WC ID is required";
    if (!name.trim()) e.name = "Name is required";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave({ wc_id: wcId.trim(), name: name.trim(), type, status });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-4">
        {initial && relation && (
          <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs grid grid-cols-2 gap-3">
            <div>
              <div className="uppercase tracking-wider font-semibold text-[10px] text-muted-foreground">
                Materials
              </div>
              <div className="text-lg font-bold">{relation.mats}</div>
            </div>
            <div>
              <div className="uppercase tracking-wider font-semibold text-[10px] text-muted-foreground">
                Operators
              </div>
              <div className="text-lg font-bold">{relation.ops}</div>
            </div>
          </div>
        )}
        <Field label="WC ID" error={errors.wcId}>
          <input
            value={wcId}
            onChange={(e) => setWcId(e.target.value)}
            disabled={!!initial}
            className={`${inputCls} ${initial ? "opacity-60 cursor-not-allowed" : ""} font-mono`}
            placeholder="CRS-1"
          />
        </Field>
        <Field label="Name" error={errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as WCType)} className={inputCls}>
            <option value="Rolling">Rolling</option>
            <option value="Processing">Processing</option>
          </select>
        </Field>
        <Field label="Status">
          <Toggle value={status} onChange={setStatus} />
        </Field>
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-secondary/30">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 4. Routing Rules
// ============================================================
function performanceLevel(rate: number, yieldPct: number): { label: string; tone: Tone } {
  // Composite score: normalized rate (out of 40 MT/hr) * yield
  const score = Math.min(rate / 40, 1) * (yieldPct / 100);
  if (score >= 0.6) return { label: "High", tone: "success" };
  if (score >= 0.35) return { label: "Medium", tone: "warning" };
  return { label: "Low", tone: "destructive" };
}

function RoutingScreen({
  rows,
  setRows,
  materials,
  workCentres,
  initialIntent,
}: {
  rows: RoutingRule[];
  setRows: React.Dispatch<React.SetStateAction<RoutingRule[]>>;
  materials: Material[];
  workCentres: WorkCentre[];
  initialIntent?: NavIntent;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"complete" | "incomplete" | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RoutingRule | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!initialIntent) return;
    if (initialIntent.kind === "incomplete-routing") setStatusFilter("incomplete");
    else if (initialIntent.kind === "filter-all") setStatusFilter("all");
  }, [initialIntent]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !r.material_code.toLowerCase().includes(q) &&
        !r.work_centre.toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "all") {
        const m = materials.find((mm) => mm.material_code === r.material_code);
        const w = workCentres.find((ww) => ww.wc_id === r.work_centre);
        const incomplete = !m || !w || r.ideal_rate <= 0 || r.yield_pct <= 0 || r.yield_pct > 100;
        if (statusFilter === "incomplete" && !incomplete) return false;
        if (statusFilter === "complete" && incomplete) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, materials, workCentres]);

  const openEdit = (r: RoutingRule) => {
    setEditing(r);
    setDrawerOpen(true);
  };
  const handleSave = (r: RoutingRule) => {
    if (editing) setRows((prev) => prev.map((p) => (p.id === editing.id ? r : p)));
    else setRows((prev) => [r, ...prev]);
    setDrawerOpen(false);
  };
  const duplicate = (r: RoutingRule) => {
    setRows((prev) => [{ ...r, id: `r${Date.now()}` }, ...prev]);
  };

  return (
    <>
      <ScreenShell
        title="Routing & Production Rules"
        subtitle="Defines how each material runs on each work centre"
        search={search}
        onSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
        entityLabel="routing rule"
        csvTemplate={"material_code,work_centre,ideal_rate,setup_time,yield_pct\nCR-IS513-CR2-060-1250,CRS-1,18,45,96\n"}
        onImportRows={(csvRows) => {
          let added = 0;
          let skipped = 0;
          const matSet = new Set(materials.map((m) => m.material_code));
          const wcSet = new Set(workCentres.map((w) => w.wc_id));
          const next: RoutingRule[] = [];
          let seq = rows.length + 1;
          for (const r of csvRows) {
            const material_code = (r.material_code || "").trim();
            const work_centre = (r.work_centre || "").trim();
            const ideal_rate = parseFloat(r.ideal_rate);
            const setup_time = parseFloat(r.setup_time);
            const yield_pct = parseFloat(r.yield_pct);
            if (
              !material_code ||
              !work_centre ||
              !matSet.has(material_code) ||
              !wcSet.has(work_centre) ||
              isNaN(ideal_rate) ||
              ideal_rate <= 0 ||
              isNaN(setup_time) ||
              setup_time < 0 ||
              isNaN(yield_pct) ||
              yield_pct <= 0 ||
              yield_pct > 100
            ) {
              skipped++;
              continue;
            }
            next.push({
              id: `r${Date.now()}_${seq++}`,
              material_code,
              work_centre,
              ideal_rate,
              setup_time,
              yield_pct,
            });
            added++;
          }
          if (added > 0) setRows((prev) => [...prev, ...next]);
          return { added, skipped };
        }}
        filters={
          <FilterChip
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "complete", label: "Complete" },
              { value: "incomplete", label: "Incomplete" },
            ]}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/40">
              <tr>
                <Th>Material Code</Th>
                <Th>Work Centre</Th>
                <Th className="text-right">Rate (MT/hr)</Th>
                <Th className="text-right">Setup (min)</Th>
                <Th className="text-right">Yield (%)</Th>
                <Th>Performance</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const m = materials.find((mm) => mm.material_code === r.material_code);
                const w = workCentres.find((ww) => ww.wc_id === r.work_centre);
                const incomplete =
                  !m || !w || r.ideal_rate <= 0 || r.yield_pct <= 0 || r.yield_pct > 100;
                const perf = performanceLevel(r.ideal_rate, r.yield_pct);
                const yieldTone: Tone =
                  r.yield_pct >= 97 ? "success" : r.yield_pct >= 92 ? "warning" : "destructive";
                return (
                  <tr
                    key={r.id}
                    onClick={() => openEdit(r)}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      incomplete ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-secondary/40"
                    }`}
                  >
                    <Td className="font-mono text-xs">{r.material_code}</Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold">{r.work_centre}</span>
                    </Td>
                    <Td className="text-right tabular-nums font-semibold">{r.ideal_rate.toFixed(1)}</Td>
                    <Td className="text-right tabular-nums">{r.setup_time}</Td>
                    <Td className="text-right">
                      <span className={`font-semibold tabular-nums ${toneText[yieldTone]}`}>
                        {r.yield_pct.toFixed(1)}%
                      </span>
                    </Td>
                    <Td>
                      <Pill tone={perf.tone}>{perf.label}</Pill>
                    </Td>
                    <Td>
                      {incomplete ? (
                        <Pill tone="destructive">incomplete</Pill>
                      ) : (
                        <Pill tone="success">configured</Pill>
                      )}
                    </Td>
                    <Td className="text-right">
                      <RowActions
                        onView={() => openEdit(r)}
                        onEdit={() => openEdit(r)}
                        onDuplicate={() => duplicate(r)}
                        onDelete={() => setConfirm(r.id)}
                      />
                    </Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No routing rules defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScreenShell>

      <Drawer
        open={drawerOpen}
        title={editing ? "Edit Routing Rule" : "Add Routing Rule"}
        onClose={() => setDrawerOpen(false)}
      >
        <RoutingForm
          initial={editing}
          materials={materials}
          workCentres={workCentres}
          onCancel={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        title="Delete routing rule?"
        message="This routing definition will be removed."
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setRows((prev) => prev.filter((p) => p.id !== confirm));
          setConfirm(null);
        }}
      />
    </>
  );
}

function RoutingForm({
  initial,
  materials,
  workCentres,
  onCancel,
  onSave,
}: {
  initial: RoutingRule | null;
  materials: Material[];
  workCentres: WorkCentre[];
  onCancel: () => void;
  onSave: (r: RoutingRule) => void;
}) {
  const [materialCode, setMaterialCode] = useState(initial?.material_code ?? materials[0]?.material_code ?? "");
  const [wc, setWc] = useState(initial?.work_centre ?? workCentres[0]?.wc_id ?? "");
  const [rate, setRate] = useState<string>(initial ? String(initial.ideal_rate) : "");
  const [setup, setSetup] = useState<string>(initial ? String(initial.setup_time) : "");
  const [yieldPct, setYieldPct] = useState<string>(initial ? String(initial.yield_pct) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!materialCode) e.materialCode = "Required";
    if (!wc) e.wc = "Required";
    const rN = Number(rate);
    const sN = Number(setup);
    const yN = Number(yieldPct);
    if (!rate || Number.isNaN(rN) || rN <= 0) e.rate = "Rate must be a positive number";
    if (!setup || Number.isNaN(sN) || sN < 0) e.setup = "Setup must be ≥ 0";
    if (!yieldPct || Number.isNaN(yN) || yN < 0 || yN > 100) e.yield = "Yield must be 0–100";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave({
      id: initial?.id ?? `r${Date.now()}`,
      material_code: materialCode,
      work_centre: wc,
      ideal_rate: rN,
      setup_time: sN,
      yield_pct: yN,
    });
  };

  const previewPerf = performanceLevel(Number(rate) || 0, Number(yieldPct) || 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-4">
        <Field label="Material Code" error={errors.materialCode}>
          <select value={materialCode} onChange={(e) => setMaterialCode(e.target.value)} className={inputCls}>
            {materials.map((m) => (
              <option key={m.material_code} value={m.material_code}>
                {m.material_code} · {m.grade}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Work Centre" error={errors.wc}>
          <select value={wc} onChange={(e) => setWc(e.target.value)} className={inputCls}>
            {workCentres.map((w) => (
              <option key={w.wc_id} value={w.wc_id}>
                {w.wc_id} · {w.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ideal Rate (MT/hr)" error={errors.rate}>
            <input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Setup (min)" error={errors.setup}>
            <input
              type="number"
              step="1"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Yield (%)" error={errors.yield}>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={yieldPct}
            onChange={(e) => setYieldPct(e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs flex items-center justify-between">
          <span className="uppercase tracking-wider font-semibold text-[10px] text-muted-foreground">
            Predicted Performance
          </span>
          <Pill tone={previewPerf.tone}>{previewPerf.label}</Pill>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-secondary/30">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 5. Shifts
// ============================================================
function shiftDuration(start: string, end: string): string {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(end) - toMin(start);
  if (diff <= 0) diff += 24 * 60;
  return (diff / 60).toFixed(1);
}

function ShiftsScreen({
  rows,
  setRows,
  workCentres,
  relations,
}: {
  rows: Shift[];
  setRows: React.Dispatch<React.SetStateAction<Shift[]>>;
  workCentres: WorkCentre[];
  relations: Record<string, { capacity: number }>;
}) {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const filtered = rows.filter(
    (r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const handleSave = (s: Shift) => {
    if (editing) setRows((prev) => prev.map((p) => (p.id === editing.id ? s : p)));
    else setRows((prev) => [...prev, s]);
    setDrawerOpen(false);
  };
  const duplicate = (s: Shift) => {
    setRows((prev) => [...prev, { ...s, id: `s${Date.now()}`, name: `${s.name}'` }]);
  };

  return (
    <>
      <ScreenShell
        title="Shift Configuration"
        subtitle={`${rows.length} shifts defined`}
        search={search}
        onSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
        entityLabel="shift"
        csvTemplate={"name,start,end,linked_wcs\nD,06:00,14:00,CRS-1|CRS-2\n"}
        onImportRows={(csvRows) => {
          let added = 0;
          let skipped = 0;
          const wcSet = new Set(workCentres.map((w) => w.wc_id));
          const existing = new Set(rows.map((r) => r.name.toUpperCase()));
          const next: Shift[] = [];
          let seq = rows.length + 1;
          for (const r of csvRows) {
            const name = (r.name || "").trim();
            const start = (r.start || "").trim();
            const end = (r.end || "").trim();
            const linked = (r.linked_wcs || "")
              .split(/[|;,]/)
              .map((s) => s.trim())
              .filter((s) => s && wcSet.has(s));
            const timeOk = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end);
            if (!name || !timeOk || existing.has(name.toUpperCase())) {
              skipped++;
              continue;
            }
            existing.add(name.toUpperCase());
            next.push({ id: `s${Date.now()}_${seq++}`, name, start, end, linked_wcs: linked });
            added++;
          }
          if (added > 0) setRows((prev) => [...prev, ...next]);
          return { added, skipped };
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/40">
              <tr>
                <Th>Shift</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Duration</Th>
                <Th>Linked Work Centres</Th>
                <Th className="text-right">Capacity (hrs)</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => {
                    setEditing(s);
                    setDrawerOpen(true);
                  }}
                  className="border-b border-border hover:bg-secondary/40 cursor-pointer"
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                        {s.name}
                      </span>
                      <span className="font-semibold">Shift {s.name}</span>
                    </div>
                  </Td>
                  <Td className="font-mono">{s.start}</Td>
                  <Td className="font-mono">{s.end}</Td>
                  <Td className="text-muted-foreground">{shiftDuration(s.start, s.end)} hrs</Td>
                  <Td>
                    {s.linked_wcs.length === 0 ? (
                      <Pill tone="warning">none linked</Pill>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {s.linked_wcs.map((w) => (
                          <span
                            key={w}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-secondary/60"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums font-semibold">
                    {(relations[s.id]?.capacity ?? 0).toFixed(1)}
                  </Td>
                  <Td className="text-right">
                    <RowActions
                      onView={() => {
                        setEditing(s);
                        setDrawerOpen(true);
                      }}
                      onEdit={() => {
                        setEditing(s);
                        setDrawerOpen(true);
                      }}
                      onDuplicate={() => duplicate(s)}
                      onDelete={() => setConfirm(s.id)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenShell>

      <Drawer
        open={drawerOpen}
        title={editing ? "Edit Shift" : "Add Shift"}
        onClose={() => setDrawerOpen(false)}
      >
        <ShiftForm
          initial={editing}
          workCentres={workCentres}
          onCancel={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        title="Delete shift?"
        message="This shift will be removed from the configuration."
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setRows((prev) => prev.filter((p) => p.id !== confirm));
          setConfirm(null);
        }}
      />
    </>
  );
}

function ShiftForm({
  initial,
  workCentres,
  onCancel,
  onSave,
}: {
  initial: Shift | null;
  workCentres: WorkCentre[];
  onCancel: () => void;
  onSave: (s: Shift) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [start, setStart] = useState(initial?.start ?? "06:00");
  const [end, setEnd] = useState(initial?.end ?? "14:00");
  const [linked, setLinked] = useState<string[]>(initial?.linked_wcs ?? []);
  const [error, setError] = useState("");

  const toggleWc = (id: string) => {
    setLinked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = () => {
    if (!name.trim()) {
      setError("Shift name is required");
      return;
    }
    onSave({
      id: initial?.id ?? `s${Date.now()}`,
      name: name.trim(),
      start,
      end,
      linked_wcs: linked,
    });
  };

  const dur = parseFloat(shiftDuration(start, end));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-4">
        <Field label="Shift Name" error={error}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="A"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Time">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="End Time">
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">
            Duration: <span className="font-semibold text-foreground">{dur.toFixed(1)} hrs</span>
          </span>
          <span className="text-muted-foreground">
            Capacity: <span className="font-semibold text-foreground">{(dur * linked.length).toFixed(1)} hrs</span>
          </span>
        </div>

        <Field label="Linked Work Centres">
          <div className="flex flex-wrap gap-1.5">
            {workCentres.map((w) => {
              const on = linked.includes(w.wc_id);
              return (
                <button
                  key={w.wc_id}
                  type="button"
                  onClick={() => toggleWc(w.wc_id)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-mono transition-colors ${
                    on
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {w.wc_id}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-secondary/30">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 6. Operators
// ============================================================
function OperatorsScreen({
  rows,
  setRows,
  workCentres,
  shifts,
  initialIntent,
}: {
  rows: Operator[];
  setRows: React.Dispatch<React.SetStateAction<Operator[]>>;
  workCentres: WorkCentre[];
  shifts: Shift[];
  initialIntent?: NavIntent;
}) {
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<SkillLevel | "all">("all");
  const [assignFilter, setAssignFilter] = useState<"assigned" | "unassigned" | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Operator | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!initialIntent) return;
    if (initialIntent.kind === "filter-assignment") setAssignFilter(initialIntent.assign);
    else if (initialIntent.kind === "unassigned-ops") setAssignFilter("unassigned");
    else if (initialIntent.kind === "filter-all") {
      setAssignFilter("all");
      setSkillFilter("all");
    }
  }, [initialIntent]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.operator_id.toLowerCase().includes(q))
        return false;
      if (skillFilter !== "all" && r.skill !== skillFilter) return false;
      if (assignFilter !== "all") {
        const assigned = !!r.work_centre && !!r.shift;
        if (assignFilter === "assigned" && !assigned) return false;
        if (assignFilter === "unassigned" && assigned) return false;
      }
      return true;
    });
  }, [rows, search, skillFilter, assignFilter]);

  const handleSave = (op: Operator) => {
    if (editing) setRows((prev) => prev.map((p) => (p.operator_id === editing.operator_id ? op : p)));
    else if (!rows.some((r) => r.operator_id === op.operator_id)) setRows((prev) => [op, ...prev]);
    setDrawerOpen(false);
  };
  const duplicate = (o: Operator) => {
    const next = `OP-${2000 + rows.length + 1}`;
    setRows((prev) => [{ ...o, operator_id: next, name: `${o.name} (Copy)` }, ...prev]);
  };
  const toggleStatus = (id: string) =>
    setRows((prev) =>
      prev.map((p) => (p.operator_id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p)),
    );

  return (
    <>
      <ScreenShell
        title="Operators"
        subtitle={`${rows.length} operators · ${rows.filter((r) => r.status === "active").length} active`}
        search={search}
        onSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
        entityLabel="operator"
        csvTemplate={"operator_id,name,skill,work_centre,shift,status\nOP-2099,New Operator,Mid,CRS-1,A,active\n"}
        onImportRows={(csvRows) => {
          let added = 0;
          let skipped = 0;
          const wcSet = new Set(workCentres.map((w) => w.wc_id));
          const shiftSet = new Set(shifts.map((s) => s.name));
          const existing = new Set(rows.map((r) => r.operator_id));
          let seq = rows.length + 1;
          const next: Operator[] = [];
          for (const r of csvRows) {
            const name = (r.name || "").trim();
            const skillRaw = (r.skill || "Mid").trim();
            const skill: SkillLevel = ["Junior", "Mid", "Senior"].includes(skillRaw)
              ? (skillRaw as SkillLevel)
              : "Mid";
            const wcRaw = (r.work_centre || "").trim();
            const work_centre = wcRaw && wcSet.has(wcRaw) ? wcRaw : "";
            const shRaw = (r.shift || "").trim().toUpperCase();
            const shift = shRaw && shiftSet.has(shRaw) ? shRaw : "";
            const status: ActiveStatus =
              (r.status || "active").toLowerCase() === "inactive" ? "inactive" : "active";
            let id = (r.operator_id || "").trim();
            if (!name) {
              skipped++;
              continue;
            }
            if (!id) id = `OP-${2000 + seq++}`;
            if (existing.has(id)) {
              skipped++;
              continue;
            }
            existing.add(id);
            next.push({ operator_id: id, name, skill, work_centre, shift, status });
            added++;
          }
          if (added > 0) setRows((prev) => [...prev, ...next]);
          return { added, skipped };
        }}
        filters={
          <>
            <FilterChip
              label="Skill"
              value={skillFilter}
              onChange={setSkillFilter}
              options={[
                { value: "Junior", label: "Junior" },
                { value: "Mid", label: "Mid" },
                { value: "Senior", label: "Senior" },
              ]}
            />
            <FilterChip
              label="Assignment"
              value={assignFilter}
              onChange={setAssignFilter}
              options={[
                { value: "assigned", label: "Assigned" },
                { value: "unassigned", label: "Unassigned" },
              ]}
            />
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/40">
              <tr>
                <Th>Operator ID</Th>
                <Th>Name</Th>
                <Th>Skill</Th>
                <Th>Work Centre</Th>
                <Th>Shift</Th>
                <Th>Assignment</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const unassigned = !o.work_centre || !o.shift;
                return (
                  <tr
                    key={o.operator_id}
                    onClick={() => {
                      setEditing(o);
                      setDrawerOpen(true);
                    }}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      unassigned ? "bg-warning/10 hover:bg-warning/15" : "hover:bg-secondary/40"
                    }`}
                  >
                    <Td className="font-mono text-xs">{o.operator_id}</Td>
                    <Td className="font-semibold">{o.name}</Td>
                    <Td>
                      <Pill tone={SKILL_TONE[o.skill]}>{o.skill}</Pill>
                    </Td>
                    <Td className="font-mono text-xs">
                      {o.work_centre || <span className="text-destructive">— none —</span>}
                    </Td>
                    <Td>
                      {o.shift ? (
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 text-primary text-xs font-bold">
                          {o.shift}
                        </span>
                      ) : (
                        <span className="text-destructive text-xs">— none —</span>
                      )}
                    </Td>
                    <Td>
                      {unassigned ? (
                        <Pill tone="warning">unassigned</Pill>
                      ) : (
                        <Pill tone="success">assigned</Pill>
                      )}
                    </Td>
                    <Td>
                      <StatusPill s={o.status} />
                    </Td>
                    <Td className="text-right">
                      <RowActions
                        onView={() => {
                          setEditing(o);
                          setDrawerOpen(true);
                        }}
                        onEdit={() => {
                          setEditing(o);
                          setDrawerOpen(true);
                        }}
                        onDuplicate={() => duplicate(o)}
                        onToggle={() => toggleStatus(o.operator_id)}
                        active={o.status === "active"}
                        onDelete={() => setConfirm(o.operator_id)}
                      />
                    </Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No operators match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScreenShell>

      <Drawer
        open={drawerOpen}
        title={editing ? "Edit Operator" : "Add Operator"}
        onClose={() => setDrawerOpen(false)}
      >
        <OperatorForm
          initial={editing}
          workCentres={workCentres}
          shifts={shifts}
          existingIds={rows.map((r) => r.operator_id)}
          onCancel={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        title="Delete operator?"
        message={`This will remove operator ${confirm}.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setRows((prev) => prev.filter((p) => p.operator_id !== confirm));
          setConfirm(null);
        }}
      />
    </>
  );
}

function OperatorForm({
  initial,
  workCentres,
  shifts,
  existingIds,
  onCancel,
  onSave,
}: {
  initial: Operator | null;
  workCentres: WorkCentre[];
  shifts: Shift[];
  existingIds: string[];
  onCancel: () => void;
  onSave: (o: Operator) => void;
}) {
  const [opId, setOpId] = useState(
    initial?.operator_id ?? `OP-${2000 + existingIds.length + 1}`,
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [skill, setSkill] = useState<SkillLevel>(initial?.skill ?? "Mid");
  const [wc, setWc] = useState(initial?.work_centre ?? "");
  const [shift, setShift] = useState(initial?.shift ?? "");
  const [status, setStatus] = useState<ActiveStatus>(initial?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!opId.trim()) e.opId = "Operator ID is required";
    if (!name.trim()) e.name = "Name is required";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave({
      operator_id: opId.trim(),
      name: name.trim(),
      skill,
      work_centre: wc,
      shift,
      status,
    });
  };

  const unassigned = !wc || !shift;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-4">
        {unassigned && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning font-medium">
            ⚠ Unassigned — operator needs both a work centre and a shift to be schedulable.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Operator ID" error={errors.opId}>
            <input
              value={opId}
              onChange={(e) => setOpId(e.target.value)}
              disabled={!!initial}
              className={`${inputCls} ${initial ? "opacity-60 cursor-not-allowed" : ""} font-mono`}
            />
          </Field>
          <Field label="Skill Level">
            <select value={skill} onChange={(e) => setSkill(e.target.value as SkillLevel)} className={inputCls}>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
            </select>
          </Field>
        </div>
        <Field label="Name" error={errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Assigned Work Centre">
          <select value={wc} onChange={(e) => setWc(e.target.value)} className={inputCls}>
            <option value="">— Unassigned —</option>
            {workCentres.map((w) => (
              <option key={w.wc_id} value={w.wc_id}>
                {w.wc_id} · {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assigned Shift">
          <select value={shift} onChange={(e) => setShift(e.target.value)} className={inputCls}>
            <option value="">— Unassigned —</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.name}>
                Shift {s.name} · {s.start} – {s.end}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <Toggle value={status} onChange={setStatus} />
        </Field>
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-secondary/30">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}
