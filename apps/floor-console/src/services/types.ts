import type {
  DispatchItem,
  Handover,
  Operator,
} from "@/types";

// ─── Request/Submission Types ────────────────────────────────────────────────

/**
 * A production event submitted from the floor console (e.g., setup started,
 * production started, production completed).
 */
export interface ProductionEvent {
  type: string;
  item_id: string;
  wo_id: string;
  operator_id: string;
  occurred_at: string;
  qty_good_mt?: number;
  scrap_qty_mt?: number;
  notes?: string;
}

/**
 * A stoppage report submitted when the line is stopped.
 */
export interface StoppageReport {
  category: string;
  sub_reason?: string;
  notes?: string;
  operator_id: string;
  occurred_at: string;
}

/**
 * A reject report submitted when defective material is identified.
 */
export interface RejectReport {
  wo_id: string;
  qty_mt: number;
  category: string;
  disposition: string;
  notes: string;
  operator_id: string;
  occurred_at: string;
}

/**
 * Data submitted when an outgoing operator hands over the shift.
 */
export interface HandoverSubmission {
  machine_state: string;
  safety_notes: string;
  pending_items: string[];
  operator_id: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

/**
 * Result of a badge validation request against the backend.
 */
export interface BadgeValidationResult {
  valid: boolean;
  token?: string;
  operator?: Operator;
  error?: string;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

/**
 * Typed error thrown by the service layer when the backend returns an error
 * response. Preserves the HTTP status code and error message for UI handling.
 */
export class ServiceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}

// ─── Service Interface ───────────────────────────────────────────────────────

/**
 * Abstraction layer for floor-console data operations. Implementations can
 * target either mock data (for local development) or the live backend API.
 */
export interface FloorService {
  /** Fetch the dispatch items for a given work center. */
  getDispatchItems(wcId: string): Promise<DispatchItem[]>;

  /** Submit a production event (start setup, start production, complete job, etc.). */
  submitProductionEvent(event: ProductionEvent): Promise<void>;

  /** Report a line stoppage. */
  reportStoppage(stoppage: StoppageReport): Promise<void>;

  /** Report a reject. */
  reportReject(reject: RejectReport): Promise<void>;

  /** Get the current handover for a shift, or null if none exists. */
  getHandover(shiftId: string): Promise<Handover | null>;

  /** Submit a shift handover. */
  submitHandover(handover: HandoverSubmission): Promise<void>;

  /** Acknowledge an incoming handover with an optional comment. */
  acknowledgeHandover(handoverId: string, comment?: string): Promise<void>;

  /** Validate an operator badge ID against the backend. */
  validateBadge(badgeId: string): Promise<BadgeValidationResult>;
}
