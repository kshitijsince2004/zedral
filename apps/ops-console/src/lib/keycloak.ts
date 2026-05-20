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
      onLoad: "login-required",
      checkLoginIframe: false,
    });
    return authenticated;
  },
  async login() {
    if (!keycloakInstance) return;
    await keycloakInstance.login();
  },
  async logout() {
    if (!keycloakInstance) return;
    await keycloakInstance.logout({ redirectUri: window.location.origin });
  },
  getToken() { return keycloakInstance?.token; },
  async refreshToken() {
    if (!keycloakInstance) return false;
    try { return await keycloakInstance.updateToken(60); } catch { return false; }
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
