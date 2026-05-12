import type { WorkOrder, Coil, InboundShipment, PipelineStage } from "@/types/m5a";

export const PIPELINE: PipelineStage[] = [
  { id: "stores", label: "Stores", count: 18 },
  { id: "pickling", label: "Pickling", count: 6 },
  { id: "rolling", label: "Rolling", count: 4 },
  { id: "annealing", label: "Annealing", count: 5 },
  { id: "rewind", label: "Rewind", count: 3 },
  { id: "fg", label: "FG", count: 7 },
  { id: "dispatched", label: "Dispatched", count: 12 },
];

export const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-1001", customer: "Maruti Suzuki", spec: "IS-513-CR2", reqDate: "2026-04-22", reqMt: 22.5, availMt: 22.5, expectedMt: 0, shortfall: 0, status: "ready", earliestReady: "2026-04-20 14:00", reservedCoils: [{ id: "coil_HR_298451", mt: 22.5 }], stage: "stores" },
  { id: "WO-1008", customer: "Tata Motors", spec: "IS-513-CR3", reqDate: "2026-04-21", reqMt: 15.0, availMt: 15.0, expectedMt: 0, shortfall: 0, status: "ready", earliestReady: "2026-04-20 09:00", reservedCoils: [{ id: "coil_HR_298452", mt: 15.0 }], stage: "stores" },
  { id: "WO-1009", customer: "Mahindra", spec: "IS-513-CR2", reqDate: "2026-04-23", reqMt: 8.0, availMt: 8.0, expectedMt: 0, shortfall: 0, status: "ready", earliestReady: "2026-04-21 10:00", reservedCoils: [{ id: "coil_HR_298455", mt: 8.0 }], stage: "stores" },
  { id: "WO-1002", customer: "JSW Auto", spec: "IS-1079-D", reqDate: "2026-04-25", reqMt: 18.0, availMt: 10.5, expectedMt: 7.5, shortfall: 0, status: "partial", earliestReady: "2026-04-24 18:00", reservedCoils: [{ id: "coil_HR_298453", mt: 10.5 }], stage: "pickling" },
  { id: "WO-1005", customer: "Hyundai India", spec: "IS-1079-CR", reqDate: "2026-04-30", reqMt: 25.5, availMt: 18.0, expectedMt: 5.0, shortfall: 2.5, status: "partial", earliestReady: "2026-04-29 12:00", reservedCoils: [{ id: "coil_HR_298461", mt: 18.0 }], resolution: "RESCHEDULE", stage: "annealing" },
  { id: "WO-1003", customer: "Ashok Leyland", spec: "IS-513-CR4", reqDate: "2026-04-28", reqMt: 30.0, availMt: 0, expectedMt: 22.0, shortfall: 8.0, status: "shortage", earliestReady: "—", reservedCoils: [], resolution: "EXPEDITE", stage: "stores" },
  { id: "WO-1006", customer: "Bajaj Auto", spec: "IS-513-CR5", reqDate: "2026-05-05", reqMt: 12.0, availMt: 0, expectedMt: 12.0, shortfall: 0, status: "pending", earliestReady: "2026-05-04 08:00", reservedCoils: [], stage: "stores" },
  { id: "WO-1007", customer: "Hero MotoCorp", spec: "IS-1079-D", reqDate: "2026-05-08", reqMt: 20.0, availMt: 0, expectedMt: 0, shortfall: 20.0, status: "shortage", earliestReady: "—", reservedCoils: [], resolution: "ALT GRADE", stage: "stores" },
];

export const COILS: Coil[] = [
  { id: "coil_HR_298451", grade: "IS5986-Fe410", gauge: "4.0×1250mm", weight: 22.5, stage: "stores", reservedFor: "WO-1001", heat: "H-2026-04-1234", supplier: "JSW Steel", hold: false, sapRef: "MB52/4451", grDate: "2026-04-18", weightInitial: 22.5 },
  { id: "coil_HR_298452", grade: "IS5986-Fe410", gauge: "4.0×1250mm", weight: 15.0, stage: "stores", reservedFor: "WO-1008", heat: "H-2026-04-1235", supplier: "JSW Steel", hold: false, sapRef: "MB52/4452", grDate: "2026-04-18", weightInitial: 15.0 },
  { id: "coil_HR_298453", grade: "IS5986-Fe410", gauge: "3.5×1200mm", weight: 18.0, stage: "pickling", reservedFor: "WO-1002", heat: "H-2026-04-1230", supplier: "SAIL", hold: false, sapRef: "MB52/4453", grDate: "2026-04-17", weightInitial: 18.0 },
  { id: "coil_HR_298460", grade: "IS5986-Fe350", gauge: "4.5×1050mm", weight: 12.0, stage: "rolling", heat: "H-2026-04-1201", supplier: "Tata Steel", hold: false, sapRef: "MB52/4460", grDate: "2026-04-15", weightInitial: 12.0 },
  { id: "coil_HR_298461", grade: "IS5986-Fe350", gauge: "4.5×1050mm", weight: 20.5, stage: "annealing", heat: "H-2026-04-1198", supplier: "JSW Steel", hold: false, sapRef: "MB52/4461", grDate: "2026-04-14", weightInitial: 20.5 },
  { id: "coil_HR_298470", grade: "IS5986-Fe410", gauge: "3.0×900mm", weight: 8.0, stage: "stores", heat: "H-2026-04-1240", supplier: "SAIL", hold: true, ncr: "NCR-0042", sapRef: "MB52/4470", grDate: "2026-04-19", weightInitial: 8.0 },
  { id: "coil_CR_298451_001", grade: "IS-513-CR2", gauge: "0.6×1250mm", weight: 21.8, stage: "fg", heat: "H-2026-04-1234", supplier: "Hero Steel CR", hold: false, parent: "coil_HR_298451", sapRef: "MB52/CR4451", grDate: "2026-04-19", weightInitial: 22.0 },
  { id: "coil_HR_298480", grade: "IS5986-Fe350", gauge: "5.0×1150mm", weight: 25.0, stage: "stores", heat: "H-2026-04-1222", supplier: "SAIL", hold: false, sapRef: "MB52/4480", grDate: "2026-04-19", weightInitial: 25.0 },
];

export const INBOUND: InboundShipment[] = [
  { id: "GR_5008924", supplier: "JSW Steel", spec: "IS5986-Fe410 · 4.0×1250", mt: 45.0, date: "Apr 21", age: 0, status: "ON TIME", tone: "success" },
  { id: "GR_5008925", supplier: "SAIL", spec: "IS5986-Fe350 · 4.5×1050", mt: 30.0, date: "Apr 22", age: 0, status: "ON TIME", tone: "success" },
  { id: "GR_5008900", supplier: "Tata Steel", spec: "IS5986-Fe410 · 3.5×1200", mt: 22.0, date: "Apr 17", age: 3, status: "OVERDUE", tone: "warning" },
  { id: "GR_5008888", supplier: "JSW Steel", spec: "IS5986-Fe350 · 5.0×1100", mt: 18.0, date: "Apr 15", age: 5, status: "OVERDUE", tone: "destructive" },
  { id: "GR_5008910", supplier: "SAIL", spec: "IS5986-Fe410 · 4.0×1250", mt: 40.0, date: "Apr 19", age: 1, status: "OVERDUE", tone: "warning" },
  { id: "GR_5008930", supplier: "Tata Steel", spec: "IS5986-Fe350 · 3.0×900", mt: 12.0, date: "Apr 24", age: 0, status: "ON TIME", tone: "success" },
];

