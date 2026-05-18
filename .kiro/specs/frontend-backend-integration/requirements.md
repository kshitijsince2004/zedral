# Requirements Document

## Introduction

The Zedral MES platform consists of two frontend applications (ops-console and floor-console) and a backend stack (4 microservices, Postgres, Redpanda, Keycloak, nginx gateway). Currently, both frontends operate exclusively on mock data with no real authentication or backend connectivity. This feature integrates the frontends with the live backend by adding Keycloak OIDC authentication to ops-console, building a service layer for floor-console, completing backend JWT validation, updating nginx to serve frontends as static files (single-origin architecture), and establishing CI/CD pipelines for building and deploying frontends to the VM.

## Glossary

- **Ops_Console**: The operations management web application used by supervisors and administrators to manage work orders, master data, and material inventory.
- **Floor_Console**: The shop-floor Andon terminal web application used by operators to manage production dispatch, stoppages, rejects, and shift handovers.
- **API_Client**: The HTTP client module in each frontend responsible for making authenticated requests to the backend API gateway.
- **Auth_Module**: The Keycloak OIDC integration module in ops-console that handles login, token lifecycle, and session management.
- **Auth_Guard**: A route-level component that redirects unauthenticated users to the Keycloak login page.
- **Service_Layer**: The abstraction layer in floor-console that provides async functions to fetch and mutate data via the API, replacing direct mock imports.
- **JWT_Validator**: The backend FastAPI dependency that decodes and verifies Keycloak-issued JWT access tokens using JWKS.
- **Nginx_Gateway**: The nginx reverse proxy that serves frontend static files and proxies API requests to backend microservices.
- **Token_Store**: The in-memory storage mechanism (via keycloak-js) that holds the current access token, refresh token, and token expiry metadata.
- **CI_Pipeline**: The GitHub Actions workflow that builds frontend assets and deploys them to the production VM.
- **Keycloak**: The OpenID Connect identity provider that issues JWT tokens and manages user accounts and roles for the Zedral platform.
- **RBAC_Role**: One of three authorization levels (admin, supervisor, operator) assigned to users in Keycloak and enforced in the frontend.

## Requirements

### Requirement 1: Keycloak OIDC Authentication for Ops Console

**User Story:** As an ops-console user, I want to authenticate via Keycloak so that only authorized personnel can access the operations dashboard.

#### Acceptance Criteria

1. WHEN the Ops_Console application initializes, THE Auth_Module SHALL initialize the keycloak-js adapter with the Keycloak server URL, realm, and client ID from environment variables.
2. WHEN an unauthenticated user navigates to any protected route, THE Auth_Guard SHALL redirect the user to the Keycloak login page.
3. WHEN Keycloak returns an authorization code after successful login, THE Auth_Module SHALL exchange the code for access and refresh tokens and store them in the Token_Store.
4. WHEN the access token expires within 60 seconds of a request, THE Auth_Module SHALL use the refresh token to obtain a new access token without user interaction.
5. IF the refresh token is expired or invalid, THEN THE Auth_Module SHALL redirect the user to the Keycloak login page and clear the local session.
6. WHEN a user clicks the logout button, THE Auth_Module SHALL invoke the Keycloak logout endpoint and clear all local session state.
7. WHEN authentication succeeds, THE Auth_Module SHALL extract the user's RBAC_Role from the token claims and populate the session store.

### Requirement 2: Authenticated API Client for Ops Console

**User Story:** As an ops-console developer, I want the API client to automatically attach valid auth tokens so that all backend requests are authenticated without manual intervention.

#### Acceptance Criteria

1. WHEN the API_Client sends a request to the backend, THE API_Client SHALL include the current access token from the Token_Store in the Authorization header as a Bearer token.
2. WHEN the API_Client receives a 401 response, THE API_Client SHALL attempt one token refresh and retry the original request.
3. IF the token refresh fails during a retry, THEN THE API_Client SHALL reject the request and trigger a redirect to the Keycloak login page.
4. THE API_Client SHALL construct request URLs using the VITE_API_BASE_URL environment variable as the base path.

### Requirement 3: Role-Based Access Control from Keycloak Claims

**User Story:** As a supervisor, I want my permissions to be determined by my Keycloak role so that access control is centrally managed and consistent.

#### Acceptance Criteria

1. WHEN mock mode is disabled, THE useRBAC hook SHALL read the user's RBAC_Role from the session store (populated from Keycloak token claims) instead of the VITE_MOCK_ROLE environment variable.
2. WHEN mock mode is enabled, THE useRBAC hook SHALL continue reading the role from the VITE_MOCK_ROLE environment variable for local development.
3. THE Auth_Module SHALL map the Keycloak realm role claim to one of the defined RBAC_Role values (admin, supervisor, operator).

### Requirement 4: Floor Console Service Layer

**User Story:** As a floor-console developer, I want a service layer that abstracts data fetching so that the store can be populated from the real backend API instead of hardcoded mocks.

#### Acceptance Criteria

1. THE Service_Layer SHALL provide async functions for fetching dispatch items, submitting production events, reporting stoppages, reporting rejects, and managing handovers.
2. WHEN mock mode is enabled, THE Service_Layer SHALL return data from the existing mock modules.
3. WHEN mock mode is disabled, THE Service_Layer SHALL make HTTP requests to the Nginx_Gateway API endpoints.
4. THE Service_Layer SHALL include the operator's session token in the Authorization header of each request.
5. WHEN the Service_Layer receives an error response from the backend, THE Service_Layer SHALL throw a typed error containing the HTTP status code and error message.
6. THE floor-console Zustand store SHALL call Service_Layer functions to load initial data instead of directly importing mock data at module level.

### Requirement 5: Floor Console Authentication

**User Story:** As a floor operator, I want my badge-in to be validated against the backend so that only registered operators can access the terminal.

#### Acceptance Criteria

1. WHEN an operator submits a badge ID on the login screen, THE Floor_Console SHALL send the badge ID to the backend authentication endpoint for validation.
2. WHEN the backend returns a valid session token for the badge ID, THE Floor_Console SHALL store the token and mark the session as authenticated.
3. IF the backend rejects the badge ID, THEN THE Floor_Console SHALL display an error message indicating invalid credentials.
4. WHEN mock mode is enabled, THE Floor_Console SHALL accept any badge ID and create a local session without contacting the backend.

### Requirement 6: Backend JWT Validation

**User Story:** As a platform administrator, I want the backend to properly validate JWT tokens so that unauthorized requests are rejected.

#### Acceptance Criteria

1. THE JWT_Validator SHALL fetch the Keycloak JWKS (JSON Web Key Set) from the Keycloak realm endpoint and cache the keys.
2. WHEN a request includes a Bearer token, THE JWT_Validator SHALL decode the token using the RS256 algorithm and the cached JWKS keys.
3. WHEN the token signature is invalid, THE JWT_Validator SHALL return a 401 HTTP response with a descriptive error message.
4. WHEN the token is expired, THE JWT_Validator SHALL return a 401 HTTP response indicating token expiration.
5. WHEN the AUTH_DISABLED environment variable is set to true, THE JWT_Validator SHALL skip token validation and return a default dev-user claim set.
6. THE JWT_Validator SHALL validate the token issuer claim matches the configured Keycloak realm URL.
7. THE JWT_Validator SHALL extract and return the user's roles, subject, and preferred_username from the validated token claims.

### Requirement 7: Nginx Single-Origin Frontend Serving

**User Story:** As a DevOps engineer, I want nginx to serve both frontends and proxy API calls from the same origin so that CORS configuration is eliminated and deployment is simplified.

#### Acceptance Criteria

1. THE Nginx_Gateway SHALL serve the ops-console static files at the root path (/).
2. THE Nginx_Gateway SHALL serve the floor-console static files at the /floor/ path.
3. THE Nginx_Gateway SHALL proxy requests matching /api/* to the appropriate backend microservice.
4. WHEN a request path does not match a static file or API route under the ops-console root, THE Nginx_Gateway SHALL return the ops-console index.html to support client-side routing.
5. WHEN a request path under /floor/ does not match a static file, THE Nginx_Gateway SHALL return the floor-console index.html to support client-side routing.
6. THE Nginx_Gateway SHALL set appropriate Cache-Control headers: immutable caching for hashed asset files and no-cache for index.html files.

### Requirement 8: Mock Mode Toggle

**User Story:** As a developer, I want to easily switch between mock mode and live API mode so that I can develop locally without a running backend.

#### Acceptance Criteria

1. WHEN VITE_USE_MOCK is set to false, THE Ops_Console SHALL use the API_Client to fetch all data from the backend.
2. WHEN VITE_USE_MOCK is set to true or is absent, THE Ops_Console SHALL use mock data modules for all service calls.
3. WHEN VITE_USE_MOCK is set to false, THE Floor_Console SHALL use the Service_Layer to fetch all data from the backend.
4. WHEN VITE_USE_MOCK is set to true or is absent, THE Floor_Console SHALL use mock data for all service calls.
5. THE Ops_Console SHALL require VITE_API_BASE_URL to be set when VITE_USE_MOCK is false.

### Requirement 9: CI/CD Pipeline for Frontend Deployment to VM

**User Story:** As a DevOps engineer, I want GitHub Actions to build and deploy frontends to the production VM so that deployments are automated and consistent.

#### Acceptance Criteria

1. WHEN code is pushed to the main branch, THE CI_Pipeline SHALL build both frontend applications with production environment variables (VITE_USE_MOCK=false, VITE_API_BASE_URL pointing to the relative API path).
2. THE CI_Pipeline SHALL copy the built static assets to the production VM via SSH.
3. THE CI_Pipeline SHALL place ops-console assets in the nginx static file directory for the root path.
4. THE CI_Pipeline SHALL place floor-console assets in the nginx static file directory for the /floor/ path.
5. IF the frontend build fails, THEN THE CI_Pipeline SHALL fail the workflow and report the build error.
6. THE CI_Pipeline SHALL retain the existing backend deployment job and run frontend deployment in parallel.

### Requirement 10: Environment Configuration for Production

**User Story:** As a DevOps engineer, I want production environment variables to be correctly configured so that frontends connect to the real backend and Keycloak instance.

#### Acceptance Criteria

1. THE Ops_Console production build SHALL set VITE_USE_MOCK to false.
2. THE Ops_Console production build SHALL set VITE_API_BASE_URL to the relative path (empty string or /) since the frontend is served from the same origin as the API.
3. THE Ops_Console production build SHALL set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, and VITE_KEYCLOAK_CLIENT_ID to the production Keycloak values.
4. THE Floor_Console production build SHALL set VITE_USE_MOCK to false.
5. THE Floor_Console production build SHALL set VITE_API_BASE_URL to the relative path for same-origin API access.
6. THE docker-compose production configuration SHALL set AUTH_DISABLED to false.
