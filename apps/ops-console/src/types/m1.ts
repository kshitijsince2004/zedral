export type WOStatus = "Pending" | "Running" | "Completed";
export type Readiness = "Ready" | "Partial" | "Blocked";
export type Priority = "High" | "Medium" | "Low";

export interface DemandWO {
  wo_id: string;
  customer: string;
  material_code: string;
  qty_mt: number;
  work_centre: string;
  priority: Priority;
  status: WOStatus;
  due_date: string;
  material_exists: boolean;
  routing_exists: boolean;
  wc_active: boolean;
  operator_assigned: boolean;
}

export interface FilterState {
  priority: Priority | "all";
  status: WOStatus | "all";
  readiness: Readiness | "all";
  workCentre: string | "all";
  customer: string | "all";
  missing: "material" | "routing" | "wc" | null;
}
