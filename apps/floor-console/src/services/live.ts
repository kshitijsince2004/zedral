import type {
  DispatchItem,
  Handover,
} from "@/types";
import type {
  BadgeValidationResult,
  FloorService,
  HandoverSubmission,
  ProductionEvent,
  RejectReport,
  StoppageReport,
} from "./types";
import { ServiceError } from "./types";

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL: string = import.meta.env["VITE_API_BASE_URL"] ?? "";
const M6_PREFIX = "/api/m6/";

// ─── Token accessor ──────────────────────────────────────────────────────────

/**
 * Module-level token getter. Set via `setTokenAccessor` so the store can
 * provide the operator session token without a circular dependency.
 */
let getToken: (() => string | undefined) | null = null;

/**
 * Register a function that returns the current operator session token.
 * Called once during app bootstrap (from the store or service factory).
 */
export function setTokenAccessor(accessor: () => string | undefined): void {
  getToken = accessor;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken?.();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = BASE_URL + M6_PREFIX + path;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ServiceError(response.status, message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ─── Live FloorService implementation ────────────────────────────────────────

export const liveService: FloorService = {
  async getDispatchItems(wcId: string): Promise<DispatchItem[]> {
    return request<DispatchItem[]>(
      `dispatch/${encodeURIComponent(wcId)}`,
    );
  },

  async submitProductionEvent(event: ProductionEvent): Promise<void> {
    await request<void>("events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  },

  async reportStoppage(stoppage: StoppageReport): Promise<void> {
    await request<void>("stoppages", {
      method: "POST",
      body: JSON.stringify(stoppage),
    });
  },

  async reportReject(reject: RejectReport): Promise<void> {
    await request<void>("rejects", {
      method: "POST",
      body: JSON.stringify(reject),
    });
  },

  async getHandover(shiftId: string): Promise<Handover | null> {
    return request<Handover | null>(
      `handovers/${encodeURIComponent(shiftId)}`,
    );
  },

  async submitHandover(handover: HandoverSubmission): Promise<void> {
    await request<void>("handovers", {
      method: "POST",
      body: JSON.stringify(handover),
    });
  },

  async acknowledgeHandover(
    handoverId: string,
    comment?: string,
  ): Promise<void> {
    await request<void>(
      `handovers/${encodeURIComponent(handoverId)}/acknowledge`,
      {
        method: "POST",
        body: JSON.stringify({ comment }),
      },
    );
  },

  async validateBadge(badgeId: string): Promise<BadgeValidationResult> {
    return request<BadgeValidationResult>("auth/badge", {
      method: "POST",
      body: JSON.stringify({ badge_id: badgeId }),
    });
  },
};
