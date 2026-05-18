import type { DispatchItem, Handover, Operator } from "@/types";
import { mockDispatchItems, deviceContext } from "@/mocks/data";
import type {
  FloorService,
  ProductionEvent,
  StoppageReport,
  RejectReport,
  HandoverSubmission,
  BadgeValidationResult,
} from "./types";

/**
 * Mock operator derived from the existing device context mock data.
 */
const mockOperator: Operator = {
  operator_id: deviceContext.operator_id,
  operator_name: deviceContext.operator_name,
  shift: deviceContext.shift,
};

/**
 * Mock implementation of the FloorService interface.
 * Returns data from the existing mocks module and accepts any input
 * for mutation/validation methods, enabling local development without a backend.
 */
export const mockService: FloorService = {
  async getDispatchItems(_wcId: string): Promise<DispatchItem[]> {
    return mockDispatchItems;
  },

  async submitProductionEvent(_event: ProductionEvent): Promise<void> {
    // No-op in mock mode
  },

  async reportStoppage(_stoppage: StoppageReport): Promise<void> {
    // No-op in mock mode
  },

  async reportReject(_reject: RejectReport): Promise<void> {
    // No-op in mock mode
  },

  async getHandover(_shiftId: string): Promise<Handover | null> {
    return null;
  },

  async submitHandover(_handover: HandoverSubmission): Promise<void> {
    // No-op in mock mode
  },

  async acknowledgeHandover(
    _handoverId: string,
    _comment?: string,
  ): Promise<void> {
    // No-op in mock mode
  },

  async validateBadge(_badgeId: string): Promise<BadgeValidationResult> {
    return {
      valid: true,
      token: "mock-token",
      operator: mockOperator,
    };
  },
};
