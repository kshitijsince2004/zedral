// Material / coil types — shared between Ops Console and Floor Console

export type CoilStage =
  | "expected"
  | "stores"
  | "pickling"
  | "rolling"
  | "annealing"
  | "rewind"
  | "fg"
  | "dispatched"
  | "rejected"
  | "scrapped";

export interface Coil {
  coil_id: string;
  sap_coil_ref: string | null;
  parent_coil_id: string | null;
  material_code: string;
  grade: string;
  gauge_mm: number;
  width_mm: number;
  weight_initial_mt: number;
  weight_remaining_mt: number;
  heat_number: string | null;
  supplier: string | null;
  current_stage: CoilStage;
  is_quality_hold: boolean;
  hold_reason: string | null;
  is_aged_out: boolean;
  reserved_for_wo: string | null;
  reservation_qty_mt: number | null;
  gr_date: string | null;
  arrived_at_stores: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoilStageHistoryEntry {
  history_id: number;
  coil_id: string;
  from_stage: CoilStage | null;
  to_stage: CoilStage;
  transition_at: string;
  triggered_by: string;
  user_id: string | null;
  device_id: string | null;
  related_wo_id: string | null;
  notes: string | null;
}

export type WoReadinessStatus = "ready" | "partial" | "pending" | "shortage";

export interface WoReadiness {
  wo_id: string;
  required_qty_mt: number;
  available_qty_mt: number;
  expected_qty_mt: number;
  shortfall_qty_mt: number;
  status: WoReadinessStatus;
  earliest_ready_at: string | null;
  reserved_coils: Array<{ coil_id: string; qty_mt: number }> | null;
  expected_coils: Array<{ coil_id: string; expected_at: string }> | null;
  shortage_resolution_path: string | null;
  calculated_at: string;
}

export interface InboundExpected {
  expectation_id: string;
  coil_id: string | null;
  sap_doc_ref: string;
  material_code: string;
  grade: string;
  gauge_mm: number;
  width_mm: number;
  expected_weight_mt: number;
  supplier: string | null;
  expected_at: string | null;
  is_overdue: boolean;
  is_received: boolean;
  received_at: string | null;
  notes: string | null;
  created_at: string;
}
