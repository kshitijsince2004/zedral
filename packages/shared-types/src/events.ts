// Event envelope types — used by Floor Console API layer and backend services

export interface EventSource {
  system: string;       // e.g. "floor_console", "m1-demand"
  user_id: string;      // operator_id or service account
  device_id: string;    // e.g. "andon_crs2"
}

export interface ExecutionEventEnvelope<T = Record<string, unknown>> {
  event_id: string;           // UUID v7 — idempotency key
  event_type: string;         // e.g. "floor.production.completed"
  schema_version: string;     // e.g. "1.0"
  occurred_at: string;        // ISO 8601 — when the event happened
  recorded_at: string;        // ISO 8601 — when submitted to broker
  source: EventSource;
  plant_id: string;           // e.g. "hsl_ludhiana"
  aggregate_id: string;       // primary entity ID
  causation_id: string | null;
  correlation_id: string | null;
  payload: T;
  signature: string;          // "hmac-sha256:<hex>"
}

// Typed payloads for each floor event type
export interface SetupStartedPayload {
  wc_id: string;
  dispatch_item_id: string;
  wo_id: string;
  setup_reason: string | null;
  grade_from: string | null;
  grade_to: string;
  gauge_from_mm: number | null;
  gauge_to_mm: number;
  roll_change_reqd: boolean;
}

export interface SetupCompletedPayload {
  wc_id: string;
  dispatch_item_id: string;
  wo_id: string;
  actual_duration_min: number;
}

export interface ProductionStartedPayload {
  wc_id: string;
  dispatch_item_id: string;
  wo_id: string;
  coil_id: string | null;
  planned_qty_mt: number;
}

export interface ProductionCompletedPayload {
  wc_id: string;
  dispatch_item_id: string;
  wo_id: string;
  actual_qty_mt: number;
  scrap_qty_mt: number;
  coils_consumed: Array<{ coil_id: string; consumed_mt: number }>;
  actual_duration_min: number;
  notes: string | null;
}

export interface StoppageStartedPayload {
  wc_id: string;
  dispatch_item_id: string | null;
  /** v0.2: FK to master.stoppage_codes.code (e.g. '07' for Raw Material) */
  reason_category: string;
  reason_detail: string | null;
  notes: string | null;
}

export interface StoppageEndedPayload {
  wc_id: string;
  stoppage_id: string;
  duration_min: number;
}

export interface RejectRaisedPayload {
  wc_id: string;
  wo_id: string;
  coil_id: string | null;
  qty_mt: number;
  /** v0.2: FK to master.defect_codes.code */
  defect_category: string;
  defect_detail: string | null;
  disposition: string;
}

export interface ShiftHandoverPayload {
  wc_id: string;
  outgoing_shift: string;
  incoming_shift: string;
  machine_state_note: string | null;
  safety_notes: string | null;
  pending_items: string[];
}

// v0.2: Multi-pass cold rolling event payloads

export interface PassStartedPayload {
  dispatch_item_id: string;
  wo_id: string;
  wc_id: string;
  pass_number: number;
  thickness_in_mm: number | null;
}

export interface PassCompletedPayload {
  dispatch_item_id: string;
  wo_id: string;
  wc_id: string;
  pass_number: number;
  is_final: boolean;
  thickness_in_mm: number | null;
  thickness_out_mm: number;
  reduction_pct: number;
  rw_tension: number | null;
  coolant_temp_c: number | null;
  coolant_press_kg_cm2: number | null;
  duration_sec: number;
}

export interface RollChangedPayload {
  wc_id: string;
  out_roll_top_id: string | null;
  out_roll_bottom_id: string | null;
  out_cumulative_since_last_change_mt: number | null;
  in_roll_top_id: string;
  in_roll_bottom_id: string;
  in_roll_finish: "M" | "B" | null;
  reason: string;
  operator_id: string;
  crane_operator_id: string | null;
  duration_min: number | null;
}

export interface CrewConfirmedPayload {
  wc_id: string;
  shift_date: string;
  shift: "A" | "B" | "C";
  line_incharge_id: string;
  crew_members: string[];
  crane_operator_id: string | null;
  shift_manager_id: string | null;
  confirmed_by: string;
}

export interface ShiftReportSignedPayload {
  handover_id: string;
  wc_id: string;
  shift_date: string;
  shift: "A" | "B" | "C";
  line_incharge_id: string;
  signed_at: string;
  device_id: string;
}

export interface ShiftReportApprovedPayload {
  handover_id: string;
  wc_id: string;
  shift_date: string;
  shift: "A" | "B" | "C";
  shift_manager_id: string;
  approved_at: string;
}

// Union of all floor event types
export type FloorEventType =
  | "floor.setup.started"
  | "floor.setup.completed"
  | "floor.setup.abandoned"
  | "floor.production.started"
  | "floor.production.completed"
  | "floor.downtime.started"
  | "floor.downtime.ended"
  | "floor.reject.raised"
  | "floor.shift.handover_submitted"
  // v0.2 additions
  | "floor.pass.started"
  | "floor.pass.completed"
  | "floor.roll.changed"
  | "floor.shift.crew_confirmed"
  | "floor.shift_report.signed"
  | "floor.shift_report.approved"
  | "floor.shift_report.correction_requested";
