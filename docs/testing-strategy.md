# Automated Testing Strategy

## 1. Testing Strategy Overview

The testing strategy prioritizes **business correctness, security boundaries, and authorization rules** over purely visual or superficial rendering tests.

Automated tests will be introduced across three distinct test suites matching the monorepo architecture:

```
                      ┌──────────────────────────────────────────┐
                      │    Automated Testing Strategy Suites     │
                      └────────────────────┬─────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                                 │                                 │
┌────────▼──────────────┐       ┌──────────▼──────────────┐       ┌──────────▼──────────────┐
│  Backend Security &   │       │  React Customer Portal  │       │ Angular Support Workspace│
│   API Suite (Phase 3) │       │   Unit Suite (Phase 4)  │       │   Spec Suite (Phase 5)  │
└───────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

---

## 2. Backend Security & API Integration Test Plan (Phase 3)

Located in `/backend/tests/`:

- **Authentication Endpoints**:
  - `POST /api/auth/login` with valid credentials returns HTTP 200, JWT token, and user payload (without password).
  - `POST /api/auth/login` with invalid credentials returns HTTP 401.
- **Customer Data Isolation**:
  - `GET /api/tickets` with customer `alice` token returns only tickets owned by Alice.
  - `GET /api/tickets/TKT-1001` with customer `bob` token returns HTTP 403 Forbidden.
- **Internal Note Redaction**:
  - `GET /api/tickets/TKT-1001` with customer `alice` token strips all messages where `isInternal === true`.
  - `GET /api/tickets/TKT-1001` with agent `charlie` token includes internal notes.
- **Role Authorization Enforcement**:
  - `POST /api/tickets/TKT-1001/notes` with customer token returns HTTP 403 Forbidden.
  - `PATCH /api/tickets/TKT-1001` with agent `charlie` token trying to reassign to agent `diana` returns HTTP 403 Forbidden.
  - `PATCH /api/tickets/TKT-1001` with manager `eve` token reassigning to agent `diana` returns HTTP 200.
- **Validation & Lifecycle Rules**:
  - `POST /api/tickets` with short title (< 5 chars) or description (< 15 chars) returns HTTP 400.
  - `PATCH /api/tickets/TKT-1001` updating status to `resolved` without resolution summary returns HTTP 400.
  - `POST /api/tickets/TKT-1001/messages` by customer on resolved ticket automatically reverts status to `requires_attention`.

---

## 3. React Customer Portal Testing Plan (Phase 4)

Located in `/customer-portal/src/`:

- **`AuthContext` & Session Management**:
  - Verifies token and user restoration from `localStorage`.
  - Verifies login rejection when non-customer credentials are supplied.
- **Navigation Route Guards**:
  - Verifies `ProtectedRoute` redirects unauthenticated users to `/login`.
  - Verifies `PublicOnlyRoute` redirects authenticated customers away from `/login`.
- **Ticket List Component**:
  - Verifies tab filtering (Active, Action Required, Resolved) and category filter select.
- **Ticket Submission Form**:
  - Verifies client-side validation triggers when title or description are below length thresholds.

---

## 4. Angular Support Workspace Testing Plan (Phase 5)

Located in `/support-workspace/src/app/`:

- **Guards**:
  - `authGuard` prevents route activation when token is absent.
  - `roleGuard` prevents non-manager agents from accessing `/manager`.
- **Services & RxJS Streams**:
  - `TicketService` reactively filters tickets via `combineLatest` when category, search query, or tab changes.
- **Dashboard Component**:
  - Verifies claim button triggers ticket assignment to logged-in agent.
- **Ticket Detail Component**:
  - Verifies dual-channel composer switches between Public Reply and Internal Note modes.
  - Verifies resolution summary modal validation before submission.
