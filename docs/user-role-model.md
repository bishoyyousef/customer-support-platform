# User and Role Model

## 1. User Roles

The platform implements three distinct user roles across the shared ecosystem:

1. `customer`: Represents end-users reporting issues and seeking resolution. Limited strictly to viewing and interacting with their own support tickets.
2. `agent`: Operational support employees responsible for investigating tickets, communicating with customers, recording internal notes, and updating ticket statuses.
3. `manager`: Lead support personnel who possess full agent capabilities plus workload analytics oversight and agent reassignment authority.

---

## 2. Pre-seeded Evaluator Personas

All pre-seeded test accounts share the standard evaluation password: **`password`**

| ID | Username | Full Name | Email | Role | Client Application Access |
|:---|:---|:---|:---|:---|:---|
| `cust_1` | `alice` | Alice Johnson | `alice@example.com` | `customer` | React Customer Portal |
| `cust_2` | `bob` | Bob Smith | `bob@example.com` | `customer` | React Customer Portal |
| `agent_1` | `agent_charlie` | Charlie Davis | `charlie@example.com` | `agent` | Angular Support Workspace |
| `agent_2` | `agent_diana` | Diana Evans | `diana@example.com` | `agent` | Angular Support Workspace |
| `mgr_1` | `manager_eve` | Eve Foster | `eve@example.com` | `manager` | Angular Support Workspace (includes Analytics & Reassignment) |

---

## 3. Role-Based Access Control (RBAC) Matrix

The following matrix documents feature permissions enforced at both the client application level and backend API layer:

| Feature / Action | Customer | Support Agent | Support Manager | Enforcement Layer |
|:---|:---:|:---:|:---:|:---|
| Sign in to Customer Portal | ✅ | ❌ | ❌ | React `AuthContext` rejects non-customer roles |
| Sign in to Support Workspace | ❌ | ✅ | ✅ | Angular `AuthService` rejects non-employee roles |
| Submit new ticket | ✅ | ❌ | ❌ | Backend `POST /api/tickets` (403 if not `customer`) |
| View ticket list | Own tickets only | All tickets | All tickets | Backend `GET /api/tickets` filters by `customerId` |
| View ticket details | Own tickets only | All tickets | All tickets | Backend `GET /api/tickets/:id` (403 if un-owned) |
| Post public reply to ticket | ✅ (Own tickets) | ✅ | ✅ | Backend `POST /api/tickets/:id/messages` |
| Post private internal note | ❌ | ✅ | ✅ | Backend `POST /api/tickets/:id/notes` (403 if `customer`) |
| Read private internal notes | ❌ (Redacted) | ✅ | ✅ | Backend `GET /api/tickets/:id` strips `isInternal` notes |
| Claim unassigned ticket | ❌ | ✅ (Self only) | ✅ | Backend `PATCH /api/tickets/:id` |
| Reassign ticket to another agent | ❌ | ❌ | ✅ | Backend `PATCH /api/tickets/:id` (403 if `agent` assigns to another ID) |
| Transition ticket status | ❌ (Reopen only) | ✅ | ✅ | Backend `PATCH /api/tickets/:id` |
| Reopen resolved ticket | ✅ (Reverts state) | ❌ | ❌ | Backend `PATCH /api/tickets/:id` (reverts status) |
| Access Workload Analytics (`/manager`) | ❌ | ❌ | ✅ | Angular `roleGuard` blocks non-manager routes |

---

## 4. Shared User Model Schema

Both frontend applications consume an identical TypeScript `User` interface:

```typescript
export type UserRole = 'customer' | 'agent' | 'manager';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
}
```
