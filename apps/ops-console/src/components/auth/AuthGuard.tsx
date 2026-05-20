// ─── AuthGuard — route-level auth wrapper ────────────────────────────────────
import { useEffect, type ReactNode } from "react";
import { env } from "@/app/env";
import { authModule } from "@/lib/keycloak";

interface Props {
  children: ReactNode;
}

/**
 * Route-level wrapper that enforces Keycloak authentication.
 *
 * - When `VITE_USE_MOCK` is true (default), renders children directly (no auth).
 * - When Keycloak URL is a placeholder or empty, renders children (auth disabled).
 * - When `VITE_USE_MOCK` is false and Keycloak is configured, checks authentication.
 */
export function AuthGuard({ children }: Props) {
  const isMockMode = env.VITE_USE_MOCK;
  const isAuthDisabled = !env.VITE_KEYCLOAK_URL || env.VITE_KEYCLOAK_URL.includes("placeholder");

  useEffect(() => {
    if (!isMockMode && !isAuthDisabled && !authModule.isAuthenticated()) {
      authModule.login();
    }
  }, [isMockMode, isAuthDisabled]);

  // Bypass auth in mock mode or when auth is disabled
  if (isMockMode || isAuthDisabled) {
    return <>{children}</>;
  }

  // In live mode with auth, only render children when authenticated
  if (!authModule.isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}
