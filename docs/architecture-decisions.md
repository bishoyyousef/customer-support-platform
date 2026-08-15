# Architecture Decision Records (ADRs)

## Project Context

The Customer Support Platform is implemented as a decoupled monorepo featuring a shared REST API backend (`/backend`), a React-based Customer Portal (`/customer-portal`), and an Angular-based Support Workspace (`/support-workspace`).

---

## ADR-001: Selection and Retention of Shared Node.js/Express REST API with Atomic Flat-File Persistence Engine

* **Status**: Accepted (Retrospective Engineering Decision)
* **Date**: August 2026

### Context

All requirement specifications (*Frontend Assignment - React and Angular.pdf*, *Customer Support Operations Platform.pdf*, and *Milestone 1.pdf*) require both the customer-facing React application and the support-facing Angular application to operate on the **same underlying business data**.

The specification document *Customer Support Operations Platform.pdf* states:
> *"A managed service such as Supabase is suitable."*

This mention of Supabase is evaluated as an illustrative example of a suitable data service rather than a mandatory technical requirement.

### Decision

Retain the custom Node.js and Express REST API located in `/backend`, backed by a JSON flat-file database (`db.json`) utilizing an atomic file write-lock engine.

### Implementation Details

1. **Atomic Write Engine**: Database write operations in `server.js` execute synchronously to a temporary file (`db.json.tmp`) before renaming to `db.json` via `fs.renameSync`. This prevents file truncation and race conditions during concurrent access.
2. **Server-Side Security**: Custom Express middlewares (`authenticate`, role checks) resolve Bearer tokens, enforce Role-Based Access Control (RBAC), filter ticket lists per customer, and strip internal notes before returning payloads to customer clients.
3. **Data Schemas**: Implements endpoints for authentication (`/api/auth/login`), ticket listing (`/api/tickets`), ticket details (`/api/tickets/:id`), ticket creation (`/api/tickets`), status/assignment updates (`/api/tickets/:id` via `PATCH`), messaging (`/api/tickets/:id/messages`), and internal notes (`/api/tickets/:id/notes`).

### Rationale & Advantages

- **Zero External Configuration**: Operates 100% locally out-of-the-box using `npm run start:all` without requiring external cloud accounts, API keys, database migrations, or active internet connectivity for evaluators.
- **Server-Side Authority**: Enforces strict security boundaries (e.g., stripping `isInternal` notes and isolating customer records) at the network layer rather than relying on frontend client logic.
- **Full Specification Compliance**: Satisfies all persistence, authentication, authorization, validation, and audit logging requirements stated across all specification documents.

### Limitations & Migration Triggers

- **Horizontal Scaling Limitation**: The flat-file persistence engine relies on local file-system locks, making it unsuitable for multi-instance distributed server deployments.
- **Triggers for Managed Service (e.g., Supabase) Migration**:
  - Explicit requirement changes mandating cloud database hosting or multi-tenant database infrastructure.
  - Requirement for database-level Row Level Security (RLS) managed by PostgreSQL.
  - Production deployment requiring horizontal server scaling across multiple cloud containers.

---

## ADR-002: Decoupled Monorepo Structure with Framework-Specific Client Applications

* **Status**: Accepted (Retrospective Engineering Decision)
* **Date**: August 2026

### Context

The platform requirements mandate two distinct user experiences:
1. A **Customer Portal** built with **React**.
2. A **Support Team Workspace** built with **Angular**.

### Decision

Structure the repository as a decoupled monorepo containing three distinct workspace directories:
- `/backend`: Node.js + Express REST API server.
- `/customer-portal`: React 18 + Vite + TypeScript application.
- `/support-workspace`: Angular 19 Standalone Component application.

Root orchestration scripts in `package.json` manage concurrent installation (`npm run install:all`) and startup (`npm run start:all` using `concurrently`).

### Rationale

- Maintains complete decoupling between customer and operational support codebases.
- Allows each frontend to utilize the idiomatic patterns of its respective framework (React Context API + Hooks vs. Angular RxJS streams + Dependency Injection + Route Guards).
- Enables simultaneous evaluation of both client applications against the single backend service.
