# Security and Authorization Approach

## 1. Security Architecture Principles

The security model of the Customer Support Platform is built on two primary principles:

1. **Server-Side Authorization as Source of Truth**: Security controls are enforced at the REST API layer (`/backend/server.js`). Client-side UI guards are treated strictly as UX boundaries to guide user navigation.
2. **Strict Data Scoping & Redaction**: Information isolation between customer accounts and protection of internal support team communications are enforced before returning JSON responses over the network.

---

## 2. Authentication Context Middleware

The Express server uses an `authenticate` middleware (`server.js:L37-L62`) to validate request authorization:

```
[ Incoming HTTP Request ] 
          │
          ▼
[ Check Authorization Header ] ──(Missing/Invalid format)──► Return 401 Unauthorized
          │
          ▼
[ Resolve Bearer Token ] (mock-jwt-token-for-<username> or username token)
          │
          ▼
[ Match Account in db.json ] ──(User not found)──────────────► Return 401 Unauthorized
          │
          ▼
[ Attach req.user & Proceed ]
```

---

## 3. Server-Side Data Isolation & Redaction Mechanisms

### Customer Ticket Isolation
- **Endpoint**: `GET /api/tickets`
- **Enforcement**: If `req.user.role === 'customer'`, the API filters tickets strictly by `customerId === req.user.id`. Customer sessions cannot list tickets submitted by other users.
- **Endpoint**: `GET /api/tickets/:id`
- **Enforcement**: If `req.user.role === 'customer'` and `ticket.customerId !== req.user.id`, the server responds immediately with **`403 Forbidden`**.

### Internal Support Note Redaction
- **Endpoint**: `GET /api/tickets/:id`
- **Enforcement**: When serving a ticket detail payload to a `customer` user, the server creates a clone of the ticket object and strips all messages where `isInternal === true`:
  ```javascript
  if (req.user.role === 'customer') {
    responseTicket.messages = responseTicket.messages.filter(msg => !msg.isInternal);
  }
  ```
- **Endpoint**: `POST /api/tickets/:id/notes`
- **Enforcement**: If `req.user.role === 'customer'`, posting internal notes is rejected immediately with **`403 Forbidden`**.

### Role-Based Operational Controls
- **Manager-Only Agent Reassignment**: `PATCH /api/tickets/:id`
- **Enforcement**: If an `agent` attempts to assign a ticket to another agent ID (other than claiming for themselves or setting to `null`), the server rejects the request with **`403 Forbidden`**. Only users with `role === 'manager'` can assign tickets to any arbitrary support agent.

---

## 4. Frontend Route Protection & Navigation Guards

Frontend client applications implement route guards to prevent unauthorized view access:

### React Customer Portal
- **`ProtectedRoute`** (`App.tsx:L10-L27`): Evaluates `isAuthenticated` state from `AuthContext`. Redirects unauthenticated visitors to `/login`.
- **`PublicOnlyRoute`** (`App.tsx:L29-L45`): Prevents logged-in users from accessing the login page, redirecting them to `/`.
- **Role Check**: `AuthContext.tsx` validates during login that `res.user.role === 'customer'`, preventing support employee credentials from logging into the customer portal.

### Angular Support Workspace
- **`authGuard`** (`auth.guard.ts`): Checks `AuthService.isAuthenticated`. Redirects unauthenticated requests to `/login`.
- **`roleGuard`** (`role.guard.ts`): Checks `AuthService.isManager()`. Protects `/manager` route, redirecting non-manager agents to `/dashboard`.
- **Role Check**: `AuthService.ts` validates during login that `res.user.role === 'agent'` or `manager`, blocking customer credentials from logging into the support workspace.
