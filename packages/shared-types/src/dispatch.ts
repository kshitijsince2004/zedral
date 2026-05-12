// Dispatch types — shared between Ops Console and Floor Console

export type DispatchStatus =
  | "pending"
  | "setup_in_progress"
  | "production_in_progress"
  | "stopped"
  | "complete"
  | "cancelled"
  | "skipped"
  | "tentative";

export interface DispatchItem {
  item_id: string;
  dispatch_id: string;
  sequence_in_shift: number;
  wo_id: string;
  op_type: "production" | "setup" | "pm";
  // Material spec
  grade: string;
  gauge_mm: number;
  width_mm: number;
  // Planning
  planned_setup_start: string | null;
  planned_setup_end: string | null;
  planned_prod_start: string | null;
  planned_prod_end: string | null;
  planned_qty_mt: number | null;
  setup_minutes_planned: number;
  changeover_reason: string | null;
  // Material
  expected_coils: Array<{ coil_id: string; qty_mt: number }> | null;
  special_notes: string | null;
  // Execution state
  actual_status: DispatchStatus;
  actual_setup_start: string | null;
  actual_setup_end: string | null;
  actual_prod_start: string | null;
  actual_prod_end: string | null;
  actual_qty_mt: number | null;
  actual_scrap_mt: number | null;
  actual_operator_id: string | null;
  notes_runtime: string | null;
  /** v0.2: TRUE if this item is re-processing a coil (from Hero Steels RE-ROLLING Y/N column) */
  is_rerolling: boolean;
  rerolling_reason: string | null;
  // Computed
  progress_pct?: number;
}

export interface DispatchList {
  dispatch_id: string;
  wc_id: string;
  shift_date: string;
  shift: "A" | "B" | "C";
  shift_start: string;
  shift_end: string;
  status: "draft" | "published" | "superseded" | "complete";
  items: DispatchItem[];
  generated_at: string;
  published_at: string | null;
}

export interface LiveLineStatus {
  wc_id: string;
  current_item: DispatchItem | null;
  actual_status: DispatchStatus;
  current_operator_id: string | null;
  active_stoppage: Stoppage | null;
}

export interface Stoppage {
  stoppage_id: string;
  wc_id: string;
  wo_id: string | null;
  shift: string | null;
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  /** v0.2: FK to master.stoppage_codes.code (e.g. '01', '07') */
  reason_category: string;
  reason_detail: string | null;
  reported_by: string;
  is_active: boolean;
}

export interface RejectRecord {
  reject_id: string;
  wc_id: string;
  wo_id: string | null;
  coil_id: string | null;
  reported_at: string;
  reported_by: string;
  /** v0.2: FK to master.defect_codes.code */
  defect_category: string;
  defect_detail: string | null;
  affected_qty_mt: number | null;
  disposition: "rework" | "downgrade" | "scrap" | "pending";
}

export interface ShiftHandover {
  handover_id: string;
  wc_id: string;
  shift_date: string;
  outgoing_shift: string;
  incoming_shift: string;
  outgoing_operator: string;
  incoming_operator: string | null;
  outgoing_signed_at: string | null;
  incoming_signed_at: string | null;
  jobs_completed: string[] | null;
  jobs_in_progress: Array<{ wo_id: string; status: string }> | null;
  pending_items: Array<{ text: string; priority: string }> | null;
  machine_state_note: string | null;
  safety_notes: string | null;
  handover_complete: boolean;
  // v0.2: digital signature workflow
  incharge_signed_at: string | null;
  incharge_signature_event_id: string | null;
  manager_approved_at: string | null;
  manager_approval_event_id: string | null;
  manager_correction_requested: boolean;
  correction_reason: string | null;
  is_immutable: boolean;
}

/** v0.2: Per-pass data for multi-pass cold rolling (3–6 passes per coil on 6 HI-MILL) */
export interface ProductionPass {
  pass_id: string;
  dispatch_item_id: string;
  pass_number: number;
  is_final: boolean;
  thickness_in_mm: number | null;
  thickness_out_mm: number;
  reduction_pct: number | null;   // computed: (in - out) / in * 100
  rw_tension: number | null;      // kN
  coolant_temp_c: number | null;
  coolant_press_kg_cm2: number | null;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;    // computed
  operator_id: string;
  notes: string | null;
}

/** v0.2: Audit trail linking physical rolls to dispatch items */
export interface RollAssignment {
  assignment_id: string;
  dispatch_item_id: string;
  roll_top_id: string;
  roll_bottom_id: string;
  assigned_at: string;
  tonnage_rolled_mt: number | null;
}

/** v0.2: Roll change event on the floor */
export interface RollChange {
  change_id: string;
  wc_id: string;
  occurred_at: string;
  out_roll_top_id: string | null;
  out_roll_bottom_id: string | null;
  out_cumulative_since_last_change_mt: number | null;
  out_roll_finish_rating: string | null;
  in_roll_top_id: string;
  in_roll_bottom_id: string;
  in_roll_finish: "M" | "B" | null;
  reason: "scheduled_grind" | "wear_threshold" | "breakage" | "grade_change" | "quality_issue";
  operator_id: string;
  crane_operator_id: string | null;
  dispatch_item_id: string | null;
  duration_min: number | null;
  linked_stoppage_id: string | null;
}

/** v0.2: Shift-level crew roster (Line Incharge, crew members, crane operator, shift manager) */
export interface ShiftCrewAssignment {
  assignment_id: string;
  wc_id: string;
  shift_date: string;
  shift: "A" | "B" | "C";
  line_incharge_id: string;
  crew_members: string[];           // operator_id list
  crane_operator_id: string | null;
  shift_manager_id: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
}
