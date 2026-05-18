# Implementation Plan: Frontend-Backend Integration

## Overview

This plan integrates the Zedral MES platform's two frontends (ops-console and floor-console) with the live backend stack. Implementation proceeds in layers: backend JWT validation first, then ops-console auth + API client, then floor-console service layer, then nginx reconfiguration, and finally CI/CD pipeline updates. Each layer builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Implement Backend JWT Validation
  - [x] 1.1 Complete `require_auth` with python-jose RS256 verification
    - Add `python-jose[cryptography]` to `backend/shared/setup.py` dependencies
    - Implement full JWT decode in `backend/shared/zedral_common/auth.py` using cached JWKS
    - Validate `exp`, `iss` (must match `KEYCLOAK_URL/realms/KEYCLOAK_REALM`), and signature
    - Return 401 with descriptive messages for invalid signature, expired token, wrong issuer
    - Return 503 when JWKS fetch fails
    - Retain `AUTH_DISABLED=true` bypass returning `{"sub": "dev-user", "preferred_username": "dev", "realm_access": {"roles": ["admin"]}}`
    - Extract and return `sub`, `preferred_username`, and `realm_access.roles` from validated claims
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 1.2 Write property test for JWT valid decode and claim extraction
    - **Property 3: JWT valid decode and claim extraction**
    - **Validates: Requirements 6.2, 6.7**
    - Use `hypothesis` to generate valid JWT payloads with arbitrary `sub`, `preferred_username`, and `realm_access.roles` values
    - Sign with a test RS256 key, verify `require_auth` returns exact same claim values
    - Place test in `backend/shared/tests/test_pbt_jwt.py`

  - [x] 1.3 Write property test for JWT invalid token rejection
    - **Property 4: JWT invalid token rejection**
    - **Validates: Requirements 6.3, 6.4, 6.6**
    - Use `hypothesis` to generate JWTs with invalid signatures, expired `exp`, or wrong `iss`
    - Verify `require_auth` raises HTTP 401 and never returns decoded claims
    - Place test in `backend/shared/tests/test_pbt_jwt.py`

- [x] 2. Implement Keycloak Auth Module for Ops Console
  - [x] 2.1 Create the Keycloak auth module
    - Create `apps/ops-console/src/lib/keycloak.ts`
    - Install `keycloak-js` package in ops-console
    - Implement `AuthModule` interface: `init()`, `login()`, `logout()`, `getToken()`, `refreshToken()`, `isAuthenticated()`, `getUserRoles()`, `onTokenExpired()`
    - Configure `onTokenExpired` to trigger silent refresh when token is within 60 seconds of expiry
    - Read config from `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` env vars
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Create the AuthGuard route wrapper component
    - Create `apps/ops-console/src/components/auth/AuthGuard.tsx`
    - When `VITE_USE_MOCK` is false, check `keycloak.authenticated` before rendering children
    - If unauthenticated, call `keycloak.login()` to redirect to Keycloak
    - When `VITE_USE_MOCK` is true, render children directly (bypass auth)
    - _Requirements: 1.2, 8.1, 8.2_

  - [x] 2.3 Implement RBAC role mapping from Keycloak claims
    - Create `apps/ops-console/src/lib/roleMapper.ts` with `mapKeycloakRole` function
    - Map Keycloak realm roles to `RBACRole` with priority: admin > supervisor > operator
    - Update `apps/ops-console/src/state/store.ts` to populate role from token claims on auth success
    - Update `apps/ops-console/src/hooks/useRBAC.ts` to read from session store when mock mode is disabled (already partially implemented)
    - _Requirements: 1.7, 3.1, 3.2, 3.3_

  - [x] 2.4 Write property test for role mapping
    - **Property 1: Role mapping produces valid RBAC role**
    - **Validates: Requirements 1.7, 3.3**
    - Use `fast-check` to generate arbitrary arrays of role strings (including empty, unknown, multiple valid roles)
    - Verify `mapKeycloakRole` always returns exactly one valid `RBACRole` value following priority order
    - Place test in `apps/ops-console/src/lib/__tests__/roleMapper.pbt.test.ts`

- [x] 3. Checkpoint - Ensure auth module compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend Ops Console API Client with Auth
  - [x] 4.1 Add Bearer token injection and 401 retry logic to `apiFetch`
    - Modify `apps/ops-console/src/services/client.ts`
    - Before each request, attach `Authorization: Bearer <token>` from the Auth Module when `VITE_USE_MOCK` is false
    - On 401 response: attempt `keycloak.updateToken(30)`, if successful retry once
    - If refresh fails, redirect to Keycloak login page
    - Preserve existing behavior when `VITE_USE_MOCK` is true
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.5_

  - [x] 4.2 Add environment validation for live mode
    - Update `apps/ops-console/src/app/env.ts` to add `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` env vars
    - Throw error when `VITE_API_BASE_URL` is missing and `VITE_USE_MOCK` is false
    - _Requirements: 8.5, 10.1, 10.2, 10.3_

  - [x] 4.3 Wire AuthGuard into the root route
    - Update `apps/ops-console/src/routes/__root.tsx` to wrap protected routes with `AuthGuard`
    - Initialize Keycloak adapter on app startup when `VITE_USE_MOCK` is false
    - _Requirements: 1.1, 1.2_

- [x] 5. Implement Floor Console Service Layer
  - [x] 5.1 Create the service layer interfaces and types
    - Create `apps/floor-console/src/services/types.ts` with `FloorService`, `BadgeValidationResult`, `ServiceError` interfaces
    - Define all method signatures: `getDispatchItems`, `submitProductionEvent`, `reportStoppage`, `reportReject`, `getHandover`, `submitHandover`, `acknowledgeHandover`, `validateBadge`
    - _Requirements: 4.1, 4.5_

  - [x] 5.2 Implement the mock service
    - Create `apps/floor-console/src/services/mock.ts`
    - Return data from existing `apps/floor-console/src/mocks/data.ts` for each function
    - Accept any badge ID and return a valid session in mock mode
    - _Requirements: 4.2, 5.4, 8.4_

  - [x] 5.3 Implement the live service
    - Create `apps/floor-console/src/services/live.ts`
    - Make HTTP requests to nginx gateway API endpoints (`/api/m6/` for dispatch operations)
    - Include operator session token in Authorization header
    - Throw `ServiceError` on error responses with status code and message
    - _Requirements: 4.3, 4.4, 4.5, 5.1, 5.2_

  - [x] 5.4 Create the service factory and wire into Zustand store
    - Create `apps/floor-console/src/services/index.ts` with factory function selecting mock or live based on `VITE_USE_MOCK`
    - Update `apps/floor-console/src/store/floorConsoleStore.ts` to call service layer functions instead of directly importing mock data
    - _Requirements: 4.6, 8.3, 8.4_

  - [x] 5.5 Write property test for service layer error preservation
    - **Property 2: Service layer error preservation**
    - **Validates: Requirements 4.5**
    - Use `fast-check` to generate arbitrary HTTP status codes (400–599) and non-empty error messages
    - Verify `ServiceError` preserves exact status and message values
    - Place test in `apps/floor-console/src/services/__tests__/serviceError.pbt.test.ts`

- [x] 6. Implement Floor Console Badge Authentication
  - [x] 6.1 Update login screen to call service layer for badge validation
    - Modify `apps/floor-console/src/components/auth/LoginScreen.tsx`
    - On badge submit: call `service.validateBadge(badgeId)`
    - On success: store token in session, mark authenticated
    - On failure: display error message (invalid badge or network error)
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Checkpoint - Ensure floor-console compiles and service layer works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Reconfigure Nginx for Single-Origin Serving
  - [x] 8.1 Rewrite nginx.conf for static file serving and API proxy
    - Modify `infra/nginx/nginx.conf`
    - Add `location /` serving ops-console static files with `try_files $uri $uri/ /index.html`
    - Add `location /floor/` serving floor-console static files with `try_files $uri $uri/ /floor/index.html`
    - Keep existing `/api/` proxy rules (upstream definitions unchanged)
    - Remove CORS helper map and CORS headers (no longer needed with single-origin)
    - Add `Cache-Control: public, max-age=31536000, immutable` for hashed asset files (`.js`, `.css`)
    - Add `Cache-Control: no-cache` for `index.html` files
    - Add volume mount references for `/var/www/zedral/ops/` and `/var/www/zedral/floor/`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 9. Update CI/CD Pipeline for VM Deployment
  - [x] 9.1 Add `deploy-frontends` job to GitHub Actions workflow
    - Modify `.github/workflows/ci.yml`
    - Add new `deploy-frontends` job that runs in parallel with `deploy-backend`
    - Steps: checkout → pnpm install → build both apps with production env vars (`VITE_USE_MOCK=false`, `VITE_API_BASE_URL=""`, Keycloak vars from secrets)
    - SCP built assets to VM: ops-console → `/var/www/zedral/ops/`, floor-console → `/var/www/zedral/floor/`
    - Fail workflow if build fails
    - Remove or update existing Cloudflare deployment jobs (replaced by VM deployment)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 9.2 Add production environment variable configuration
    - Create `apps/ops-console/.env.production` with `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=""`, Keycloak placeholder vars
    - Create `apps/floor-console/.env.production` with `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=""`
    - Update docker-compose production config to set `AUTH_DISABLED=false` for all backend services
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 10. Final checkpoint - Ensure all tests pass and builds succeed
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- TypeScript is used for all frontend code (ops-console and floor-console)
- Python is used for all backend code (JWT validation)
- `fast-check` is used for frontend property tests (already in ops-console devDependencies)
- `hypothesis` is used for backend property tests (already used in project)
- The mock mode toggle (`VITE_USE_MOCK`) is preserved throughout to maintain local dev experience

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1"], "status": "complete" },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "5.2", "5.3"], "status": "complete" },
    { "id": 2, "tasks": ["2.2", "2.3", "5.4", "5.5"] },
    { "id": 3, "tasks": ["2.4", "4.1", "4.2", "6.1"] },
    { "id": 4, "tasks": ["4.3", "8.1"] },
    { "id": 5, "tasks": ["9.1", "9.2"] }
  ]
}
```
