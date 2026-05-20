import type { RBACRole } from "@/types/common";

// ─── Config ───────────────────────────────────────────────────────────────────

interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

// ─── AuthModule interface ─────────────────────────────────────────────────────

export interface AuthModule {
  init(): Promise<boolean>;
  login(): Promise<void>;
  logout(): Promise<void>;
  getToken(): string | undefined;
  refreshToken(): Promise<boolean>;
  isAuthenticated(): boolean;
  getUserRoles(): RBACRole[];
  onTokenExpired(callback: () => void): void;
}

// ─── Keycloak config from env vars ────────────────────────────────────────────

function getKeycloakConfig(): KeycloakConfig {
  const url = import.meta.env["VITE_KEYCLOAK_URL"] as string | undefined;
  const realm = import.meta.env["VITE_KEYCLOAK_REALM"] as string | undefined;
  const clientId = import.meta.env["VITE_KEYCLOAK_CLIENT_ID"] as string | undefined;

  if (!url || !realm || !clientId) {
    throw new Error(
      "[keycloak] Missing required environment variables: " +
        "VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID"
    );
  }

  return { url, realm, clientId };
}

// ─── Singleton instance (lazy-loaded to avoid SSR window error) ───────────────

let keycloakInstance: any | null = null;

async function getKeycloakInstance(): Promise<any> {
  if (!keycloakInstance) {
    const { default: Keycloak } = await import("keycloak-js");
    const config = getKeycloakConfig();
    keycloakInstance = new Keycloak({
      url: config.url,
      realm: config.realm,
      clientId: config.clientId,
    });
  }
  return keycloakInstance;
}

// ─── Role extraction ──────────────────────────────────────────────────────────

const VALID_ROLES: RBACRole[] = ["admin", "supervisor", "operator"];

function extractRoles(kc: any): RBACRole[] {
  const realmRoles = kc.realmAccess?.roles ?? [];
  return realmRoles.filter((r: string): r is RBACRole =>
    VALID_ROLES.includes(r as RBACRole)
  );
}

// ─── Check if auth is enabled ─────────────────────────────────────────────────

function isAuthEnabled(): boolean {
  const url = import.meta.env["VITE_KEYCLOAK_URL"] as string | undefined;
  return !!url && !url.includes("placeholder");
}

// ─── Auth module implementation ───────────────────────────────────────────────

export const authModule: AuthModule = {
  async init(): Promise<boolean> {
    if (!isAuthEnabled()) return false;
    const kc = await getKeycloakInstance();

    // Configure silent token refresh when token is within 60 seconds of expiry
    kc.onTokenExpired = () => {
      kc.updateToken(60).catch(() => {
        kc.login();
      });
    };

    const authenticated = await kc.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
      checkLoginIframe: false,
    });

    return authenticated;
  },

  async login(): Promise<void> {
    if (!isAuthEnabled()) return;
    const kc = await getKeycloakInstance();
    await kc.login();
  },

  async logout(): Promise<void> {
    if (!isAuthEnabled()) return;
    const kc = await getKeycloakInstance();
    await kc.logout({ redirectUri: window.location.origin });
  },

  getToken(): string | undefined {
    if (!isAuthEnabled()) return undefined;
    return keycloakInstance?.token;
  },

  async refreshToken(): Promise<boolean> {
    if (!isAuthEnabled()) return false;
    const kc = await getKeycloakInstance();
    try {
      const refreshed = await kc.updateToken(60);
      return refreshed;
    } catch {
      return false;
    }
  },

  isAuthenticated(): boolean {
    if (!isAuthEnabled()) return true; // When auth disabled, treat as authenticated
    return keycloakInstance?.authenticated ?? false;
  },

  getUserRoles(): RBACRole[] {
    if (!isAuthEnabled()) return ["admin"];
    if (!keycloakInstance) return [];
    return extractRoles(keycloakInstance);
  },

  onTokenExpired(callback: () => void): void {
    if (!isAuthEnabled() || !keycloakInstance) return;
    const originalHandler = keycloakInstance.onTokenExpired;
    keycloakInstance.onTokenExpired = () => {
      if (originalHandler) {
        originalHandler();
      }
      callback();
    };
  },
};
