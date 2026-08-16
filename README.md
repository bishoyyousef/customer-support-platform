# Customer Support Platform Monorepo

A production-grade, full-stack monorepo implementation of a multi-user customer support platform featuring a shared Node.js/Express REST API backend, a React Customer Portal, and an Angular Support Workspace.

---

## 🏗️ System Architecture & Engineering Highlights

This project is engineered as a decoupled, multi-client ecosystem:

```
                      ┌─────────────────────────────────────────┐
                      │    Shared Node/Express REST API Server  │
                      │  Port 5000 | db.json Atomic Write-Lock  │
                      └────────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
      ┌─────────────▼─────────────┐                 ┌─────────────▼─────────────┐
      │   React Customer Portal   │                 │  Angular Support Workspace│
      │   Port 5173 | Vite + TS   │                 │   Port 4200 | Angular 19  │
      │ (Customer: Alice / Bob)   │                 │ (Agent/Manager: Charlie/  │
      └───────────────────────────┘                 │  Diana / Eve)             │
                                                    └───────────────────────────┘
```

### 1. Persistent Shared REST API Backend (`/backend`)
* **Atomic Persistence Engine**: Utilizes a flat-file database (`db.json`) featuring atomic, transaction-safe write-locks (synchronous write to `.tmp` followed by immediate atomic file renaming) to eliminate write corruption under concurrency.
* **Role-Based Access Control (RBAC)**: Custom middlewares enforce session contexts via HTTP headers. Non-owner customer sessions are prevented from viewing or modifying other tickets. Internal support notes (`isInternal: true`) are completely redacted from customer HTTP payloads.
* **Audit Logging & Activity Timeline**: Maintains a strict activity log and message history log inside the database entity tracking status transitions, timestamps, and authorship.

### 2. React Customer Portal (`/customer-portal`)
* **Vite & TypeScript**: Engineered using React 18, TypeScript, and React Router v6.
* **Auth Session Caching**: Tracks customer logins and token stores in `localStorage`. Route guards (`ProtectedRoute`) enforce authentication.
* **Searchable Ticket Panel**: Filters issues by tabs (Active, Action Required, Resolved), category select, and search text.
* **Validation & Friendly Language**: Client-side validation checks matching exact schema rules (subject length $\ge$ 5 chars, description length $\ge$ 15 chars) before submissions. Uses customer-friendly status labels ("Waiting on Support", "Waiting on You").

### 3. Angular Support Workspace (`/support-workspace`)
* **Angular 19 Standalone Architecture**: Fully modular standalone component tree protected by `authGuard` and `roleGuard`.
* **High-Density Operational Dashboard**: Uses RxJS streams combined via `combineLatest` to instantly re-filter, search, and sort queues without reloading.
* **Saved Preset Bookmarks**: Persists custom active filters to `localStorage` enabling quick-view shortcuts.
* **Dual-Channel Timeline Composer**: Provides tabs to switch between public customer replies and agent-only internal team notes.
* **Status Stepper Workflow**: Interactive transitions move tickets through investigation stages. Resolving a ticket prompts for a required resolution summary (minimum 10 characters).
* **Manager Resource Analytics**: Accessible only by manager accounts (`/manager`), providing workload allocation charts, unresolved metrics, and agent assignment controls.

---

## 🔑 Pre-seeded Evaluator Profiles

All pre-seeded test profiles share the default evaluation password: **`password`**

| Persona | Username | Full Name | Role | Accessible Client Application |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `alice` | Alice Johnson | Customer | React Customer Portal |
| **Customer** | `bob` | Bob Smith | Customer | React Customer Portal |
| **Agent** | `agent_charlie` | Charlie Davis | Agent | Angular Support Workspace |
| **Agent** | `agent_diana` | Diana Evans | Agent | Angular Support Workspace |
| **Manager** | `manager_eve` | Eve Foster | Manager | Angular Support Workspace (includes Analytics & Reassignment) |

---

## 🚀 Installation & Getting Started

### Prerequisites
* Node.js v18 or newer
* NPM v9 or newer

### Setup Steps
1. **Navigate** to the monorepo root directory.
2. **Install all packages** in a single click:
   ```bash
   npm run install:all
   ```
   *(This installs packages at the root and recursively inside `/backend`, `/customer-portal`, and `/support-workspace`)*.
3. **Start all servers** concurrently:
   ```bash
   npm run start:all
   ```

### Running Applications & Endpoints
Once launched, the platform serves the following URLs:
* **Backend REST API**: [http://localhost:5000](http://localhost:5000)
* **React Customer Portal**: [http://localhost:5173](http://localhost:5173)
* **Angular Support Workspace**: [http://localhost:4200](http://localhost:4200)

---

## ⚙️ Environment Configuration

Environment configuration templates (`.env.example`) are provided across the repository:

- **Root Monorepo**: `.env.example`
- **Backend API**: `backend/.env.example` (`PORT=5000`)
- **React Customer Portal**: `customer-portal/.env.example` (`VITE_API_BASE_URL=http://localhost:5000/api`)
- **Angular Support Workspace**: `support-workspace/.env.example` (`API_URL=http://localhost:5000/api`)

Frontend services consume environment variables with default fallbacks to `http://localhost:5000/api`.

---

## 🧪 Automated Testing Guide

The monorepo contains 34 automated unit, security, and integration tests across three dedicated test suites:

### Run All Test Suites Concurrently
To run all 34 automated tests across the monorepo:
```bash
npm test
```

### Run Individual Workspace Test Suites
- **Backend Security & Business Rules API Suite** (13 tests):
  ```bash
  npm run test:backend
  ```
  *Tests Bearer token auth, customer data isolation, internal note redaction, role authorization, validation rules, and status state machine transitions.*

- **React Customer Portal Unit & Validation Suite** (11 tests):
  ```bash
  npm run test:portal
  ```
  *Tests AuthContext session caching, role enforcement, logout clearance, ticket input validation, tab filtering, and customer status label mapping.*

- **Angular Support Workspace Unit & Guard Suite** (10 tests):
  ```bash
  npm run test:workspace
  ```
  *Tests workspace login, authGuard, roleGuard, RxJS queue filtering, manager analytics metrics, and resolution modal summary validation.*

---

## 📚 Retrospective Engineering Documentation

Detailed retrospective decision records and design specifications are located in the `docs/` directory:

- [docs/architecture-decisions.md](file:///c:/Users/hp/Desktop/frontend%20projects/customer%20support%20platform/docs/architecture-decisions.md): ADR-001 (Express REST API & Atomic Persistence) & ADR-002 (Decoupled Monorepo).
- [docs/clarification-questions.md](file:///c:/Users/hp/Desktop/frontend%20projects/customer%20support%20platform/docs/clarification-questions.md): Document relationship classification & contextual terminology alignment log.
- [docs/user-role-model.md](file:///c:/Users/hp/Desktop/frontend%20projects/customer%20support%20platform/docs/user-role-model.md): User personas, permissions matrix, and role boundaries.
- [docs/support-request-model.md](file:///c:/Users/hp/Desktop/frontend%20projects/customer%20support%20platform/docs/support-request-model.md): Support request schema, status state machine, and timeline audit logging.
- [docs/security-approach.md](file:///c:/Users/hp/Desktop/frontend%20projects/customer%20support%20platform/docs/security-approach.md): Server-side security, RBAC middleware, customer data isolation, and internal note redaction.
- [docs/assumptions-limitations.md](file:///c:/Users/hp/Desktop/frontend%20projects/customer%20support%20platform/docs/assumptions-limitations.md): Engineering assumptions, mock auth context, and flat-file database limitations.
- [docs/testing-strategy.md](file:///c:/Users/hp/Desktop/frontend%20projects/customer%20support%20platform/docs/testing-strategy.md): Automated test strategy plan and verification criteria.

---

## 🛠️ Step-by-Step Platform Verification Guide

Validate the core features by walking through this simulation:

### Step 1: Customer Ticket Submission
1. Open the **Customer Portal** (`http://localhost:5173`) and sign in using profile selector **Alice**.
2. Click **Submit New Ticket** on the dashboard.
3. Fill in details (Subject: *Billing Error*, Category: *Billing*, Description: *Charged twice for my monthly subscription*).
4. Submit and notice the new ticket appears in the list. Click it to open the details view.

### Step 2: Agent Claims Ticket
1. Open the **Support Workspace** (`http://localhost:4200`) and sign in using **Charlie** (Agent).
2. Click the **Requires Attention** tab. Your newly submitted ticket appears as **Unassigned**.
3. Click the ticket row to enter the Workspace detail view.
4. On the right panel, click **Claim Ticket**. Notice the assignee tag updates to **Charlie Davis** and the ticket relocates into the **My Workload** tab.

### Step 3: Two-Way Chat Timelines
1. As **Agent Charlie**, choose the **Public Reply** tab, type a reply, and click **Send Message**.
2. Switch back to the **Customer Portal** tab (Alice). Notice that Charlie's reply appears in the timeline within seconds (via polling).
3. Type a reply as **Customer Alice** and click **Send Message**.
4. Watch the message automatically appear in Charlie's agent timeline window.

### Step 4: Private Internal Notes Privacy
1. In the Agent console (Charlie), click the **Internal Note** tab (highlighted in orange).
2. Type a private note (e.g. *"Checked Stripe transaction logs, user was double charged"*) and click **Add Note**.
3. Verify the note is rendered on the agent's timeline in yellow with an `INTERNAL NOTE` tag.
4. Look at the Customer Portal (Alice). Verify that **no internal note is visible** (and HTTP responses show notes are completely redacted).

### Step 5: Manager Reassignment & Analytics
1. Sign out of the Agent console and log in as **Eve** (Manager).
2. Click the **Workload Analytics** link in the left sidebar navigation (`/manager`). Review agent workloads and allocation percentages.
3. Open the details view for Alice's ticket.
4. Locate the **Assign Agent** dropdown on the right panel. Choose **Diana Evans**.
5. Verify the assignee changes to Diana. Diana will now see this ticket inside her **My Workload** queue.

### Step 6: Ticket Resolution & Customer Reopen
1. As **Agent Diana**, click the **Resolve Ticket** button.
2. In the modal prompt, type a resolution summary (e.g. *"Refunded secondary transaction. Settled."*) and submit.
3. Verify that the timeline locks input text fields on both screens and shows the resolution summary banner.
4. In the Customer Portal (Alice), click **Reopen Request** at the bottom of the feed.
5. Verify the ticket status reverts to **Requires Attention** (`requires_attention`) and messaging is re-enabled.

---

## 🔒 Security & Data Isolation Architecture

- **Server-Side Enforcement**: All authorization rules are enforced in `backend/server.js`. Client-side route guards serve strictly as UX navigation boundaries.
- **Customer Data Scoping**: GET `/api/tickets` filters records by `customerId === req.user.id`. Accessing un-owned tickets directly via GET `/api/tickets/:id` returns HTTP 403 Forbidden.
- **Internal Note Redaction**: Server strips all messages where `isInternal === true` before returning payload to customer sessions.
- **Role Restrictions**: Posting internal notes is restricted to `agent` and `manager` roles (HTTP 403 for customers). Reassigning tickets to other agents is restricted to `manager` roles (HTTP 403 for agents).
