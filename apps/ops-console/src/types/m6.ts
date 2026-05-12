// Re-export shared navigation type from common
export type { M6Screen } from "./common";

// ─── Domain types ─────────────────────────────────────────────────────────────

export type LineStatus = "running" | "setup" | "stopped" | "at_risk" | "idle";

export interface Stoppage {
  reason: string;
  category: string;
  startedAt: string;
  durationMin: number;
}

export interface ProductionLine {
  id: string;
  status: LineStatus;
  woId: string;
  material: string;
  gauge: string;
  width: string;
  progress: number;
  startTime: string;
  plannedEnd: string;
  targetMt: number;
  actualMt: number;
  coilId: string;
  coilMountedAt: string;
  operator: string;
  stoppage?: Stoppage;
  setupNote?: string;
  setupElapsed?: number;
  setupPlanned?: number;
}

export interface AlertRow {
  id: string;
  severity: "critical" | "warning" | "info";
  line: string;
  message: string;
  at: string;
}

export interface JobRow {
  wo: string;
  status: "done" | "running" | "queued" | "setup";
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  material: string;
  qty: number;
}

export interface EventRow {
  ts: string;
  type: "setup" | "production" | "stoppage" | "complete";
  detail: string;
}

export interface RejectRow {
  ts: string;
  qty: number;
  reason: string;
  coil: string;
}
