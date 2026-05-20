// ─── AuthGuard — route-level auth wrapper ────────────────────────────────────
import { useEffect, type ReactNode } from "react";
import { env } from "@/app/env";
import { authModule } from "@/lib/keycloak";

interface Props {
  children: ReactNode;
}

/**
 * Route-level wrapper that enforces authentication.
 * When VITE_USE_MOCK is true or VITE_AUTH_DISABLED is true, renders children directly.
 */
export function AuthGuard({ children }: Props) {
  const skipAuth = env.VITE_USE_MOCK;

  useEffect(() => {
    if (!skipAuth && !authModule.isAuthenticated()) {
      authModule.login();
    }
  }, [skipAuth]);

  if (skipAuth || authModule.isAuthenticated()) {
    return <>{children}</>;
  }

  return null;
}
