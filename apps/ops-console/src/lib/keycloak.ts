import type { RBACRole } from "@/types/common";

// ─── Auth disabled check ──────────────────────────────────────────────────────

const AUTH_DISABLED = import.meta.env["VITE_AUTH_DISABLED"] === "true";

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

// ─── No-op auth module (when auth is disabled) ────────────────────────────────

const noopAuthModule: AuthModule = {
  async init() { return true; },
  async login() {},
  async logout() {},
  getToken() { return undefined; },
  async refreshToken() { return false; },
  isAuthenticated() { return true; },
  getUserRoles() { return ["admin"]; },
  onTokenExpired() {},
};

// ─── Real Keycloak auth module (lazy-loaded) ──────────────────────────────────

let keycloakInstance: any | null = null;

async function getKeycloakInstance(): Promise<any> {
  if (!keycloakInstance) {
    const { default: Keycloak } = await import("keycloak-js");
    const url = import.meta.env["VITE_KEYCLOAK_URL"] ?? "";
    const realm = import.meta.env["VITE_KEYCLOAK_REALM"] ?? "";
    const clientId = import.meta.env["VITE_KEYCLOAK_CLIENT_ID"] ?? "";
    keycloakInstance = new Keycloak({ url, realm, clientId });
  }
  return keycloakInstance;
}

const VALID_ROLES: RBACRole[] = ["admin", "supervisor", "operator"];

function extractRoles(kc: any): RBACRole[] {
  const realmRoles = kc.realmAccess?.roles ?? [];
  return realmRoles.filter((r: string): r is RBACRole =>
    VALID_ROLES.includes(r as RBACRole)
  );
}

const realAuthModule: AuthModule = {
  async init(): Promise<boolean> {
    const kc = await getKeycloakInstance();
    kc.onTokenExpired = () => {
      kc.updateToken(60).catch(() => { kc.login(); });
    };
    const authenticated = await kc.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
      checkLoginIframe: false,
    });
    return authenticated;
  },
  async login() {
    const kc = await getKeycloakInstance();
    await kc.login();
  },
  async logout() {
    const kc = await getKeycloakInstance();
    await kc.logout({ redirectUri: window.location.origin });
  },
  getToken() { return keycloakInstance?.token; },
  async refreshToken() {
    const kc = await getKeycloakInstance();
    try { return await kc.updateToken(60); } catch { return false; }
  },
  isAuthenticated() { return keycloakInstance?.authenticated ?? false; },
  getUserRoles() { return keycloakInstance ? extractRoles(keycloakInstance) : []; },
  onTokenExpired(callback) {
    if (!keycloakInstance) return;
    const orig = keycloakInstance.onTokenExpired;
    keycloakInstance.onTokenExpired = () => { orig?.(); callback(); };
  },
};

// ─── Export: pick the right module based on VITE_AUTH_DISABLED ─────────────────

export const authModule: AuthModule = AUTH_DISABLED ? noopAuthModule : realAuthModule;
