export type LineStatus =
  | "idle"
  | "setup_in_progress"
  | "production_in_progress"
  | "stopped";

export type DispatchStatus =
  | "complete"
  | "production_in_progress"
  | "setup_in_progress"
  | "pending"
  | "tentative";

export type CoilLocation =
  | "at_line"
  | "at_stores_reserved"
  | "not_reserved"
  | null;

export interface Operator {
  operator_id: string;
  operator_name: string;
  shift: string;
}

export interface DeviceContext {
  device_id: string;
  wc_id: string;
  wc_name: string;
  plant: string;
  shift: string;
  shift_start: string;
  shift_end: string;
  operator_id: string;
  operator_name: string;
  online: boolean;
}

export interface DispatchItem {
  item_id: string;
  sequence_in_shift: number;
  wo_id: string;
  grade: string;
  gauge_mm: number;
  width_mm: number;
  qty_planned_mt: number;
  qty_actual_mt: number | null;
  planned_start: string;
  planned_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  actual_status: DispatchStatus;
  coil_id: string | null;
  coil_location?: CoilLocation;
  setup_minutes_planned: number;
  changeover_reason: string | null;
  notes: string | null;
  progress_pct?: number;
}

export interface FloorEvent {
  id: string;
  type: string;
  occurred_at: string;
  wo_id?: string;
  coil_id?: string;
  operator_id?: string;
  duration_min?: number;
  category?: string;
  sub_reason?: string;
  qty_good_mt?: number;
}

export interface Stoppage {
  id: string;
  category: string;
  sub_reason?: string;
  notes?: string;
  started_at: string;
  ended_at?: string;
}

export interface CoilScanResult {
  success: boolean;
  coil_id: string;
  grade?: string;
  gauge_mm?: number;
  width_mm?: number;
  weight_mt?: number;
  status?: string;
  error?: "GRADE_MISMATCH" | "ALREADY_CONSUMED";
  error_detail?: string;
}

export interface UndoAction {
  id: string;
  label: string;
  expires_at: number;
  payload: unknown;
  kind: "complete_job" | "stoppage" | "reject";
}

export interface RejectRecord {
  id: string;
  wo_id: string;
  qty_mt: number;
  category: string;
  disposition: string;
  notes: string;
  raised_at: string;
}

export interface Handover {
  id: string;
  outgoing_operator: string;
  shift_from: string;
  shift_to: string;
  machine_state: string;
  safety_notes: string;
  pending_items: string[];
  submitted_at: string;
  acknowledged_at?: string;
  incoming_comment?: string;
}
