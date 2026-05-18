import type { FloorService } from "./types";
import { mockService } from "./mock";
import { liveService, setTokenAccessor } from "./live";

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Selects the service implementation based on the VITE_USE_MOCK env variable.
 * When VITE_USE_MOCK is "false" (explicitly), the live HTTP service is used.
 * Otherwise (true, absent, or any other value), mock data is used.
 */
function createService(): FloorService {
  const useMock = import.meta.env["VITE_USE_MOCK"];
  if (useMock === "false") {
    return liveService;
  }
  return mockService;
}

/**
 * Singleton service instance used throughout the application.
 * The store and components should import this rather than directly
 * importing mock data or the live service.
 */
export const service: FloorService = createService();

// Re-export setTokenAccessor so the store can wire up the token provider
export { setTokenAccessor };

// Re-export types for convenience
export type { FloorService } from "./types";
export { ServiceError } from "./types";
