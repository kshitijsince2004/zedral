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
 * - When `VITE_USE_MOCK` is false, checks `keycloak.authenticated`.
 *   If unauthenticated, triggers `keycloak.login()` to redirect to Keycloak.
 */
export function AuthGuard({ children }: Props) {
  const isMockMode = env.VITE_USE_MOCK;

  useEffect(() => {
    if (!isMockMode && !authModule.isAuthenticated()) {
      authModule.login();
    }
  }, [isMockMode]);

  // In mock mode, always render children (bypass auth)
  if (isMockMode) {
    return <>{children}</>;
  }

  // In live mode, only render children when authenticated
  if (!authModule.isAuthenticated()) {
    // Return null while redirecting to Keycloak login
    return null;
  }

  return <>{children}</>;
}
