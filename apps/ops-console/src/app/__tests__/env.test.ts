import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for env validation logic.
 * We test the parseEnv behavior by dynamically importing the module
 * with different import.meta.env values.
 */

describe("env validation", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    Object.keys(import.meta.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete (import.meta.env as Record<string, unknown>)[key];
      }
    });
    Object.assign(import.meta.env, originalEnv);
  });

  it("should not throw when VITE_USE_MOCK is true (default)", async () => {
    // When VITE_USE_MOCK is absent, it defaults to true — no validation errors
    delete (import.meta.env as Record<string, unknown>)["VITE_USE_MOCK"];
    delete (import.meta.env as Record<string, unknown>)["VITE_API_BASE_URL"];
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_URL"];
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_REALM"];
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_CLIENT_ID"];

    const { env } = await import("@/app/env");
    expect(env.VITE_USE_MOCK).toBe(true);
  });

  it("should throw EnvValidationError when VITE_USE_MOCK is false and VITE_API_BASE_URL is missing", async () => {
    (import.meta.env as Record<string, unknown>)["VITE_USE_MOCK"] = "false";
    delete (import.meta.env as Record<string, unknown>)["VITE_API_BASE_URL"];
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_URL"] = "http://keycloak:8080";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_REALM"] = "zedral";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_CLIENT_ID"] = "zedral-spa";

    await expect(import("@/app/env")).rejects.toThrow("VITE_API_BASE_URL");
  });

  it("should NOT throw when VITE_API_BASE_URL is empty string (valid for same-origin)", async () => {
    (import.meta.env as Record<string, unknown>)["VITE_USE_MOCK"] = "false";
    (import.meta.env as Record<string, unknown>)["VITE_API_BASE_URL"] = "";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_URL"] = "http://keycloak:8080";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_REALM"] = "zedral";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_CLIENT_ID"] = "zedral-spa";

    const { env } = await import("@/app/env");
    expect(env.VITE_API_BASE_URL).toBe("");
    expect(env.VITE_USE_MOCK).toBe(false);
  });

  it("should throw when VITE_USE_MOCK is false and Keycloak vars are missing", async () => {
    (import.meta.env as Record<string, unknown>)["VITE_USE_MOCK"] = "false";
    (import.meta.env as Record<string, unknown>)["VITE_API_BASE_URL"] = "";
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_URL"];
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_REALM"];
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_CLIENT_ID"];

    await expect(import("@/app/env")).rejects.toThrow("VITE_KEYCLOAK_URL");
  });

  it("should include all missing Keycloak vars in error message", async () => {
    (import.meta.env as Record<string, unknown>)["VITE_USE_MOCK"] = "false";
    (import.meta.env as Record<string, unknown>)["VITE_API_BASE_URL"] = "";
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_URL"];
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_REALM"];
    delete (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_CLIENT_ID"];

    await expect(import("@/app/env")).rejects.toThrow("VITE_KEYCLOAK_REALM");
    vi.resetModules();
    await expect(import("@/app/env")).rejects.toThrow("VITE_KEYCLOAK_CLIENT_ID");
  });

  it("should parse Keycloak env vars correctly in live mode", async () => {
    (import.meta.env as Record<string, unknown>)["VITE_USE_MOCK"] = "false";
    (import.meta.env as Record<string, unknown>)["VITE_API_BASE_URL"] = "/api";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_URL"] = "http://keycloak:8080";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_REALM"] = "zedral";
    (import.meta.env as Record<string, unknown>)["VITE_KEYCLOAK_CLIENT_ID"] = "zedral-spa";

    const { env } = await import("@/app/env");
    expect(env.VITE_KEYCLOAK_URL).toBe("http://keycloak:8080");
    expect(env.VITE_KEYCLOAK_REALM).toBe("zedral");
    expect(env.VITE_KEYCLOAK_CLIENT_ID).toBe("zedral-spa");
  });
});
