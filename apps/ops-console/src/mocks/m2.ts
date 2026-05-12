import type { Material, Customer, WorkCentre, RoutingRule, Shift, Operator } from "@/types/m2";

export const SEED_MATERIALS: Material[] = [
  { material_code: "HR-IS513-D-045-1250", grade: "IS513-D", gauge_mm: 0.45, width_mm: 1250, type: "HR", status: "active" },
  { material_code: "HR-IS5986-Fe410-080-1250", grade: "IS5986-Fe410", gauge_mm: 0.8, width_mm: 1250, type: "HR", status: "active" },
  { material_code: "CR-IS513-CR2-060-1250", grade: "IS513-CR2", gauge_mm: 0.6, width_mm: 1250, type: "CR", status: "active" },
  { material_code: "CR-IS1079-D-100-1200", grade: "IS1079-D", gauge_mm: 1.0, width_mm: 1200, type: "CR", status: "active" },
  { material_code: "FG-IS513-CR4-050-1000", grade: "IS513-CR4", gauge_mm: 0.5, width_mm: 1000, type: "FG", status: "inactive" },
  { material_code: "HR-IS5986-Fe350-450-1050", grade: "IS5986-Fe350", gauge_mm: 4.5, width_mm: 1050, type: "HR", status: "active" },
];

export const SEED_CUSTOMERS: Customer[] = [
  { customer_id: "C-1001", name: "Maruti Suzuki", priority: "high", status: "active" },
  { customer_id: "C-1002", name: "Tata Motors", priority: "high", status: "active" },
  { customer_id: "C-1003", name: "Mahindra", priority: "medium", status: "active" },
  { customer_id: "C-1004", name: "JSW Auto", priority: "medium", status: "active" },
  { customer_id: "C-1005", name: "Hyundai India", priority: "high", status: "active" },
  { customer_id: "C-1006", name: "Ashok Leyland", priority: "low", status: "inactive" },
];

export const SEED_WORKCENTRES: WorkCentre[] = [
  { wc_id: "CRS-1", name: "Cold Rolling Stand 1", type: "Rolling", status: "active" },
  { wc_id: "CRS-2", name: "Cold Rolling Stand 2", type: "Rolling", status: "active" },
  { wc_id: "CRS-3", name: "Cold Rolling Stand 3", type: "Rolling", status: "active" },
  { wc_id: "PKL-1", name: "Pickling Line 1", type: "Processing", status: "active" },
  { wc_id: "ANN-1", name: "Annealing Furnace 1", type: "Processing", status: "active" },
  { wc_id: "RWD-1", name: "Rewind Line 1", type: "Processing", status: "inactive" },
];

export const SEED_ROUTING: RoutingRule[] = [
  { id: "r1", material_code: "CR-IS513-CR2-060-1250", work_centre: "CRS-1", ideal_rate: 18, setup_time: 45, yield_pct: 96 },
  { id: "r2", material_code: "CR-IS513-CR2-060-1250", work_centre: "CRS-2", ideal_rate: 17, setup_time: 50, yield_pct: 95 },
  { id: "r3", material_code: "CR-IS1079-D-100-1200", work_centre: "CRS-2", ideal_rate: 22, setup_time: 60, yield_pct: 94 },
  { id: "r4", material_code: "HR-IS5986-Fe410-080-1250", work_centre: "PKL-1", ideal_rate: 35, setup_time: 30, yield_pct: 98 },
  { id: "r5", material_code: "HR-IS5986-Fe350-450-1050", work_centre: "ANN-1", ideal_rate: 12, setup_time: 140, yield_pct: 99 },
];

export const SEED_SHIFTS: Shift[] = [
  { id: "s1", name: "A", start: "06:00", end: "14:00", linked_wcs: ["CRS-1", "CRS-2", "PKL-1"] },
  { id: "s2", name: "B", start: "14:00", end: "22:00", linked_wcs: ["CRS-2", "CRS-3", "ANN-1"] },
  { id: "s3", name: "C", start: "22:00", end: "06:00", linked_wcs: ["CRS-1", "CRS-3"] },
];

export const SEED_OPERATORS: Operator[] = [
  { operator_id: "OP-2001", name: "Ramesh Kumar", skill: "Senior", work_centre: "CRS-2", shift: "A", status: "active" },
  { operator_id: "OP-2002", name: "Anil Verma", skill: "Mid", work_centre: "CRS-1", shift: "A", status: "active" },
  { operator_id: "OP-2003", name: "Suresh Patil", skill: "Senior", work_centre: "CRS-3", shift: "B", status: "active" },
  { operator_id: "OP-2004", name: "Deepak Joshi", skill: "Junior", work_centre: "PKL-1", shift: "A", status: "active" },
  { operator_id: "OP-2005", name: "Pradeep Singh", skill: "Mid", work_centre: "ANN-1", shift: "B", status: "inactive" },
  { operator_id: "OP-2006", name: "Vikram Rao", skill: "Junior", work_centre: "", shift: "", status: "active" },
  { operator_id: "OP-2007", name: "Manoj Shah", skill: "Mid", work_centre: "", shift: "C", status: "active" },
];
