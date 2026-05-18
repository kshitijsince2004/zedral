import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { mapKeycloakRole, KeycloakTokenClaims } from "../roleMapper";
import type { RBACRole } from "@/types/common";

/**
 * Property 1: Role mapping produces valid RBAC role
 *
 * For any array of Keycloak realm role strings (including empty arrays, arrays
 * with unknown roles, and arrays with multiple valid roles), the `mapKeycloakRole`
 * function SHALL always return exactly one valid `RBACRole` value ("admin",
 * "supervisor", or "operator") following the priority order: admin > supervisor >
 * operator (defaulting to operator when no recognized role is present).
 *
 * **Validates: Requirements 1.7, 3.3**
 */
describe("Feature: frontend-backend-integration, Property 1: Role mapping produces valid RBAC role", () => {
  const validRBACRoles: RBACRole[] = ["admin", "supervisor", "operator"];

  // Generator for arbitrary KeycloakTokenClaims with random role arrays
  const keycloakClaimsArb = (rolesArb: fc.Arbitrary<string[]>) =>
    fc.record({
      sub: fc.uuid(),
      preferred_username: fc.string({ minLength: 1 }),
      email: fc.option(fc.emailAddress(), { nil: undefined }),
      realm_access: fc.record({
        roles: rolesArb,
      }),
      iss: fc.string({ minLength: 1 }),
      exp: fc.integer({ min: 0 }),
      iat: fc.integer({ min: 0 }),
      azp: fc.string({ minLength: 1 }),
    }) as fc.Arbitrary<KeycloakTokenClaims>;

  it("always returns a valid RBACRole for any array of role strings", () => {
    fc.assert(
      fc.property(
        keycloakClaimsArb(fc.array(fc.string())),
        (claims: KeycloakTokenClaims) => {
          const result = mapKeycloakRole(claims);

          // Result must be exactly one of the valid RBAC roles
          expect(validRBACRoles).toContain(result);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns 'admin' when roles include 'admin', regardless of other roles present", () => {
    // Generate arrays that always contain "admin" plus arbitrary other roles
    const rolesWithAdmin = fc
      .array(fc.string())
      .map((roles) => [...roles, "admin"]);

    fc.assert(
      fc.property(
        keycloakClaimsArb(rolesWithAdmin),
        (claims: KeycloakTokenClaims) => {
          const result = mapKeycloakRole(claims);
          expect(result).toBe("admin");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns 'supervisor' when roles include 'supervisor' but not 'admin'", () => {
    // Generate arrays that contain "supervisor" but never "admin"
    const rolesWithSupervisorNoAdmin = fc
      .array(fc.string().filter((s) => s !== "admin"))
      .map((roles) => [...roles, "supervisor"]);

    fc.assert(
      fc.property(
        keycloakClaimsArb(rolesWithSupervisorNoAdmin),
        (claims: KeycloakTokenClaims) => {
          const result = mapKeycloakRole(claims);
          expect(result).toBe("supervisor");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns 'operator' when roles contain neither 'admin' nor 'supervisor'", () => {
    // Generate arrays that never contain "admin" or "supervisor"
    const rolesWithoutAdminOrSupervisor = fc.array(
      fc.string().filter((s) => s !== "admin" && s !== "supervisor"),
    );

    fc.assert(
      fc.property(
        keycloakClaimsArb(rolesWithoutAdminOrSupervisor),
        (claims: KeycloakTokenClaims) => {
          const result = mapKeycloakRole(claims);
          expect(result).toBe("operator");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("follows priority order: admin > supervisor > operator", () => {
    // Generate claims with both admin and supervisor roles
    const rolesWithBoth = fc
      .array(fc.string())
      .map((roles) => [...roles, "admin", "supervisor"]);

    fc.assert(
      fc.property(
        keycloakClaimsArb(rolesWithBoth),
        (claims: KeycloakTokenClaims) => {
          const result = mapKeycloakRole(claims);
          // admin takes priority over supervisor
          expect(result).toBe("admin");
        },
      ),
      { numRuns: 100 },
    );
  });
});
