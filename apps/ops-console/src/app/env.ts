import type { RBACRole } from "@/types/common";

// ─── Error class ──────────────────────────────────────────────────────────────

export class EnvValidationError extends Error {
  constructor(missing: string[]) {
    super(
      `[env] Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Check your .env file against apps/ops-console/.env.example.`
    );
    this.name = "EnvValidationError";
  }
}

// ─── Env shape ────────────────────────────────────────────────────────────────

export interface Env {
  VITE_API_BASE_URL: string;
  VITE_USE_MOCK: boolean;
  VITE_MOCK_ROLE: RBACRole;
  VITE_USE_SSE: boolean;
  VITE_PLANT_ID: string;
  VITE_KEYCLOAK_URL: string;
  VITE_KEYCLOAK_REALM: string;
  VITE_KEYCLOAK_CLIENT_ID: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function parseEnv(): Env {
  // VITE_USE_MOCK defaults to true when absent — mock mode is the safe default
  const useMockRaw = import.meta.env["VITE_USE_MOCK"];
  const useMock: boolean =
    useMockRaw === undefined || useMockRaw === null || useMockRaw === ""
      ? true
      : useMockRaw !== "false" && useMockRaw !== "0";

  const missing: string[] = [];

  // VITE_API_BASE_URL is required only when not in mock mode.
  // Note: empty string is valid (same-origin), so check for undefined/missing only.
  const apiBaseUrlRaw = import.meta.env["VITE_API_BASE_URL"];
  const apiBaseUrl: string = apiBaseUrlRaw ?? "";
  if (!useMock && apiBaseUrlRaw === undefined) {
    missing.push("VITE_API_BASE_URL");
  }

  // Keycloak env vars — required when not in mock mode
  const keycloakUrl: string = import.meta.env["VITE_KEYCLOAK_URL"] ?? "";
  const keycloakRealm: string = import.meta.env["VITE_KEYCLOAK_REALM"] ?? "";
  const keycloakClientId: string = import.meta.env["VITE_KEYCLOAK_CLIENT_ID"] ?? "";

  if (!useMock) {
    if (!keycloakUrl || keycloakUrl.includes("placeholder")) {
      // Auth disabled — Keycloak not configured, skip validation
    } else {
      if (!keycloakRealm) missing.push("VITE_KEYCLOAK_REALM");
      if (!keycloakClientId) missing.push("VITE_KEYCLOAK_CLIENT_ID");
    }
  }

  if (missing.length > 0) {
    throw new EnvValidationError(missing);
  }

  const mockRoleRaw = import.meta.env["VITE_MOCK_ROLE"];
  const validRoles: RBACRole[] = ["admin", "supervisor", "operator"];
  const mockRole: RBACRole =
    validRoles.includes(mockRoleRaw as RBACRole)
      ? (mockRoleRaw as RBACRole)
      : "admin";

  const useSseRaw = import.meta.env["VITE_USE_SSE"];
  const useSse: boolean =
    useSseRaw === "true" || useSseRaw === "1";

  const plantId: string = import.meta.env["VITE_PLANT_ID"] ?? "plant-1";

  return {
    VITE_API_BASE_URL: apiBaseUrl,
    VITE_USE_MOCK: useMock,
    VITE_MOCK_ROLE: mockRole,
    VITE_USE_SSE: useSse,
    VITE_PLANT_ID: plantId,
    VITE_KEYCLOAK_URL: keycloakUrl,
    VITE_KEYCLOAK_REALM: keycloakRealm,
    VITE_KEYCLOAK_CLIENT_ID: keycloakClientId,
  };
}

// ─── Validated env object — throws at module load if validation fails ─────────

export const env: Env = parseEnv();
