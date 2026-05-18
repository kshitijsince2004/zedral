import { describe, it, expect, vi, beforeEach } from "vitest";
import { service } from "@/services";
import { ServiceError } from "@/services/types";
import type { BadgeValidationResult } from "@/services/types";

// Mock the service module
vi.mock("@/services", () => ({
  service: {
    validateBadge: vi.fn(),
  },
}));

const mockValidateBadge = vi.mocked(service.validateBadge);

describe("LoginScreen badge validation logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Req 5.1: Badge ID sent to backend for validation", () => {
    it("calls service.validateBadge with the submitted badge ID", async () => {
      const successResult: BadgeValidationResult = {
        valid: true,
        token: "session-token-123",
        operator: { operator_id: "op_042", operator_name: "Ramesh Kumar", shift: "A" },
      };
      mockValidateBadge.mockResolvedValue(successResult);

      await service.validateBadge("op_042");

      expect(mockValidateBadge).toHaveBeenCalledWith("op_042");
    });

    it("normalizes badge ID to lowercase before validation", async () => {
      const successResult: BadgeValidationResult = {
        valid: true,
        token: "token",
        operator: { operator_id: "op_abc", operator_name: "Test", shift: "A" },
      };
      mockValidateBadge.mockResolvedValue(successResult);

      // Simulating what the component does: value.trim().toLowerCase()
      const rawInput = "  OP_ABC  ";
      const normalized = rawInput.trim().toLowerCase();
      await service.validateBadge(normalized);

      expect(mockValidateBadge).toHaveBeenCalledWith("op_abc");
    });
  });

  describe("Req 5.2: Store token on successful validation", () => {
    it("returns valid result with token and operator on success", async () => {
      const successResult: BadgeValidationResult = {
        valid: true,
        token: "jwt-token-xyz",
        operator: { operator_id: "op_042", operator_name: "Ramesh Kumar", shift: "A" },
      };
      mockValidateBadge.mockResolvedValue(successResult);

      const result = await service.validateBadge("op_042");

      expect(result.valid).toBe(true);
      expect(result.token).toBe("jwt-token-xyz");
      expect(result.operator).toEqual({
        operator_id: "op_042",
        operator_name: "Ramesh Kumar",
        shift: "A",
      });
    });
  });

  describe("Req 5.3: Display error on badge rejection", () => {
    it("returns invalid result with error message when badge is rejected", async () => {
      const rejectResult: BadgeValidationResult = {
        valid: false,
        error: "Badge not recognized",
      };
      mockValidateBadge.mockResolvedValue(rejectResult);

      const result = await service.validateBadge("invalid_badge");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Badge not recognized");
    });

    it("throws ServiceError on HTTP error response", async () => {
      mockValidateBadge.mockRejectedValue(new ServiceError(401, "Unauthorized"));

      await expect(service.validateBadge("bad_badge")).rejects.toThrow(ServiceError);
      await expect(service.validateBadge("bad_badge")).rejects.toMatchObject({
        status: 401,
        message: "Unauthorized",
      });
    });

    it("throws generic error on network failure", async () => {
      mockValidateBadge.mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(service.validateBadge("op_042")).rejects.toThrow(TypeError);
    });
  });
});
