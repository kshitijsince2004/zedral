// ─── Types barrel export ──────────────────────────────────────────────────────

// Common / shared types (includes M2Screen, M5aScreen, M6Screen, NavIntent, etc.)
export * from "./common";

// M1 — Demand & Work Order Control
// Note: m1's `Priority` ("High"|"Medium"|"Low") conflicts with m2's `Priority`
// ("high"|"medium"|"low"), so we alias it to avoid a duplicate export error.
export type { WOStatus, Readiness, Priority as M1Priority, DemandWO, FilterState } from "./m1";

// M2 — Master Data Management
// M2Screen and NavIntent are already exported from common; skip them here.
export type {
  MaterialType,
  ActiveStatus,
  Priority as M2Priority,
  WCType,
  SkillLevel,
  Material,
  Customer,
  WorkCentre,
  RoutingRule,
  Shift,
  Operator,
  M2NavRequest,
  IssueSeverity,
  Issue,
  SystemHealth,
  AuditEntry,
} from "./m2";

// M5a — Material & Inventory Control
// M5aScreen is already exported from common; skip it here.
export type { WoStatus, CoilStage, WorkOrder, Coil, InboundShipment, PipelineStage } from "./m5a";
export { STAGE_TONE, WO_STATUS_TONE } from "./m5a";

// M6 — Dispatch & Execution Control
// M6Screen is already exported from common; skip it here.
export type {
  LineStatus,
  Stoppage,
  ProductionLine,
  AlertRow,
  JobRow,
  EventRow,
  RejectRow,
} from "./m6";
