import type { RBACRole } from "@/types/common";

// ─── Keycloak Token Claims ────────────────────────────────────────────────────

export interface KeycloakTokenClaims {
  sub: string;
  preferred_username: string;
  email?: string;
  realm_access: {
    roles: string[];
  };
  iss: string;
  exp: number;
  iat: number;
  azp: string;
}

// ─── Role Mapping ─────────────────────────────────────────────────────────────

/**
 * Maps Keycloak realm roles to the highest-priority RBAC role.
 * Priority order: admin > supervisor > operator (default fallback).
 */
export function mapKeycloakRole(claims: KeycloakTokenClaims): RBACRole {
  const roles = claims.realm_access.roles;
  if (roles.includes("admin")) return "admin";
  if (roles.includes("supervisor")) return "supervisor";
  return "operator"; // default fallback
}
