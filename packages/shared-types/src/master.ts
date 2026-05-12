// Master data types — shared between Ops Console and Floor Console

export interface WorkCentre {
  wc_id: string;
  name: string;
  type: "Rolling" | "Processing";
  status: "active" | "inactive";
  gauge_min_mm?: number;
  gauge_max_mm?: number;
  width_min_mm?: number;
  width_max_mm?: number;
  created_at: string;
}

export interface Material {
  material_code: string;
  grade: string;
  gauge_mm: number;
  width_mm: number;
  type: "HR" | "CR" | "FG";
  status: "active" | "inactive";
  created_at: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  priority: "high" | "medium" | "low";
  status: "active" | "inactive";
  created_at: string;
}

export interface Operator {
  operator_id: string;
  name: string;
  skill: "Junior" | "Mid" | "Senior";
  work_centre_id: string | null;
  shift_name: string | null;
  status: "active" | "inactive";
  created_at: string;
}

export interface Shift {
  shift_id: string;
  name: "A" | "B" | "C";
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  linked_wc_ids: string[];
}

export interface Routing {
  routing_id: string;
  material_code: string;
  wc_id: string;
  std_run_rate_mt_hr: number;
  setup_time_min: number;
  yield_pct: number;
  is_active: boolean;
  /** v0.2: TRUE for 6 HI-MILL primary cold rolling (CRS-1/2); FALSE for single-pass (CRS-3 temper) */
  is_multi_pass: boolean;
  created_at: string;
}

export interface ChangeoverMatrixEntry {
  wc_id: string;
  grade_from: string;
  grade_to: string;
  gauge_step: string;
  width_step: string;
  roll_change_reqd: boolean;
  setup_min: number;
  sample_count: number;
}

/** v0.2: Roll register with extended tracking columns */
export interface Roll {
  roll_id: string;
  wc_id: string | null;
  position: string | null;           // 'top_work' | 'bottom_work' | 'backup_top' etc.
  diameter_mm: number | null;
  mt_since_change: number;
  life_limit_mt: number | null;
  status: "active" | "in_grinding" | "retired";
  installed_at: string | null;
  last_changed_at: string | null;
  supplier: string | null;
  material_grade: string | null;
  // v0.2 additions
  current_wc_id: string | null;
  current_position: "top" | "bottom" | "storage" | "grinding" | null;
  cumulative_tonnage_mt: number;
  tonnage_since_grind_mt: number;
  last_grind_date: string | null;    // ISO date
  grind_cycle_count: number;
  roll_finish: "M" | "B" | null;     // Mill | Burnish
  expected_life_mt: number | null;
}

/** v0.2: Catalogue-driven stoppage classification (replaces hard-coded 7-category list) */
export interface StoppageCode {
  code: string;          // zero-padded e.g. '01', '02'
  display_name: string;
  bucket: string;        // 'Equipment Failure' | 'Tool Change' | 'Material / Supply' | 'Utility / Support' | 'Human' | 'Planning' | 'Planned'
  is_planned: boolean;
  is_external: boolean;
  is_active: boolean;
  sort_order: number;
}

/** v0.2: Defect classification for reject events */
export interface DefectCode {
  code: string;
  display_name: string;
  family: string;              // 'Dimensional' | 'Surface' | 'Mechanical' | 'Edge' | 'Process' | 'Handling'
  severity_default: "critical" | "major" | "minor" | "cosmetic" | "variable";
  default_disposition: "hold" | "downgrade" | "rework" | "scrap" | null;
  is_active: boolean;
  sort_order: number;
}
