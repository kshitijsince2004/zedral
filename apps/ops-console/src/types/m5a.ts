// ─── M5a — Material & Inventory types ────────────────────────────────────────
import type { Tone } from "./common";
export type { M5aScreen } from "./common";

export type WoStatus = "ready" | "partial" | "pending" | "shortage";

export type CoilStage =
  | "stores"
  | "pickling"
  | "rolling"
  | "annealing"
  | "rewind"
  | "fg"
  | "dispatched";

export interface WorkOrder {
  id: string;
  customer: string;
  spec: string;
  reqDate: string;
  reqMt: number;
  availMt: number;
  expectedMt: number;
  shortfall: number;
  status: WoStatus;
  earliestReady: string;
  reservedCoils: { id: string; mt: number }[];
  resolution?: string;
  stage: CoilStage;
}

export interface Coil {
  id: string;
  grade: string;
  gauge: string;
  weight: number;
  stage: CoilStage;
  reservedFor?: string;
  heat: string;
  supplier: string;
  hold: boolean;
  ncr?: string;
  parent?: string;
  sapRef?: string;
  grDate?: string;
  weightInitial?: number;
}

export interface InboundShipment {
  id: string;
  supplier: string;
  spec: string;
  mt: number;
  date: string;
  age: number;
  status: "ON TIME" | "OVERDUE";
  tone: Tone;
}

export interface PipelineStage {
  id: CoilStage;
  label: string;
  count: number;
}

export const STAGE_TONE: Record<CoilStage, Tone> = {
  stores: "info",
  pickling: "warning",
  rolling: "success",
  annealing: "info",
  rewind: "purple",
  fg: "success",
  dispatched: "muted",
};

export const WO_STATUS_TONE: Record<WoStatus, Tone> = {
  ready: "success",
  partial: "warning",
  pending: "info",
  shortage: "destructive",
};
