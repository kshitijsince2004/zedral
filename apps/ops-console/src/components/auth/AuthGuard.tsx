// ─── AuthGuard — route-level auth wrapper ────────────────────────────────────
import type { ReactNode } from "react";
import { authModule } from "@/lib/keycloak";

interface Props {
  children: ReactNode;
}

/**
 * Route-level wrapper that enforces authentication.
 * Keycloak init with "login-required" handles the redirect automatically.
 * This guard just prevents rendering until authenticated.
 */
export function AuthGuard({ children }: Props) {
  // If authenticated (or auth disabled/mock), render children
  if (authModule.isAuthenticated()) {
    return <>{children}</>;
  }

  // Still waiting for Keycloak redirect — show nothing
  return null;
}
