# Customer Support Platform Monorepo

A production-grade, full-stack monorepo implementation of a multi-user customer support ticket platform, featuring a shared Node/Express REST API backend, a React Customer Portal, and an Angular Support Workspace.

---

## 🏗️ System Architecture & Engineering Highlights

This project is built from scratch as a decoupled, multi-client ecosystem. Key highlights include:

### 1. Persistent Shared API Backend (`/backend`)
*   **Atomic Persistence Engine**: Utilizes a robust JSON-based flat-file database (`db.json`) utilizing atomic, transaction-safe write-locks (synchronous write to `.tmp` followed by immediate file renaming) to completely eliminate write collisions or corruption under high concurrency.
*   **Role-Based Access Control (RBAC)**: Custom middlewares enforce session contexts via HTTP headers. Non-owner customer sessions are prevented from viewing or modifying other tickets. Internal support comments are completely redacted from customer responses.
*   **Audit Logging**: The server maintains a strict activity log and message history log inside the database model, tracking status transitions, timestamps, and authorship.

### 2. React Customer Portal (`/customer-portal`)
*   **Vite & TypeScript Compilation**: Engineered using React 18, TypeScript, and React Router.
*   **Auth Session Caching**: Tracks user logins and token stores in localized caches.
*   **Searchable Ticket Panel**: Filters issues by tabs (Active, Action Required, Resolved) and categories.
*   **Ticket Submission validation**: Client-side validation checks matching exact schema requirements (e.g. subject length $\ge$ 5 chars, description length $\ge$ 15 chars) before submissions.

### 3. Angular Support Workspace (`/support-workspace`)
*   **Angular 19 & Standalone Components**: Fully modular, standalone component tree.
*   **High-Density Operational Dashboard**: Uses RxJS streams combined via `combineLatest` to instantly re-filter, search, and sort queues without reloading.
*   **Saved Preset Bookmarks**: Persists custom active filters to `localStorage` enabling quick-view shortcuts.
*   **Dual-Channel TIMELINE Composer**: Provides tabs to switch between public messages and agent-only internal notes.
*   **Status Progression Stepper**: Interactive workflow transitions tickets through status stages. Resolving a ticket opens an modal prompting for a resolution summary (minimum 10 characters).
*   **Manager Resource Analytics**: Accessible only by manager accounts, providing aggregated performance analytics, unresolved metrics, and agent assignment controls.

---

## 🔑 Pre-seeded Evaluator Profiles

All profiles share the default password: **`password`**

| Persona | Username | Full Name | Role | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `alice` | Alice Johnson | Customer | Own Tickets (Submit, Read, Reply, Reopen) |
| **Customer** | `bob` | Bob Smith | Customer | Own Tickets (Submit, Read, Reply, Reopen) |
| **Agent** | `agent_charlie` | Charlie Davis | Agent | Claim, Investigate, Message, Internal Notes |
| **Agent** | `agent_diana` | Diana Evans | Agent | Claim, Investigate, Message, Internal Notes |
| **Manager** | `manager_eve` | Eve Foster | Manager | All Agent actions + Reassign Agents + View Workload Analytics |

---

## 🚀 Installation & Getting Started

### Prerequisites
*   Node.js v18 or newer
*   NPM v9 or newer

### Setup Steps
1.  **Clone or navigate** to the monorepo root directory.
2.  **Install all packages** in a single click:
    ```bash
    npm run install:all
    ```
    *(This runs npm install at the root and recursively inside `/backend`, `/customer-portal`, and `/support-workspace`)*.
3.  **Start all servers** concurrently:
    ```bash
    npm run start:all
    ```

### Running Applications
Once launched, the platform serves the following urls:
*   **Backend REST API**: [http://localhost:5000](http://localhost:5000)
*   **React Customer Portal**: [http://localhost:5173](http://localhost:5173)
*   **Angular Support Workspace**: [http://localhost:4200](http://localhost:4200)

---

## 🛠️ Step-by-Step Platform Verification Guide

Validate the core features by walking through this simulation:

### Step 1: Customer Ticket Submission
1.  Open the **Customer Portal** (`http://localhost:5173`) and sign in using profile selector **Alice**.
2.  Click **Submit New Ticket** on the dashboard.
3.  Fill in details (e.g. Subject: *Billing Error*, Category: *Billing*, Description: *Charged twice for July*).
4.  Submit and notice the new ticket appears in the list. Click it to open the details view.

### Step 2: Agent Claims Ticket
1.  Open the **Support Workspace** (`http://localhost:4200`) and sign in using **Charlie** (Agent).
2.  Click the **Requires Attention** tab. Your newly submitted ticket `TKT-xxxx` appears as **Unassigned**.
3.  Click the ticket row to enter the Workspace detail view.
4.  On the right panel, click **Claim Ticket**. Notice the assignee tag immediately updates to **Charlie Davis** and the ticket relocates into the **My Workload** tab.

### Step 3: Two-Way Chat timelines
1.  As **Agent Charlie**, choose the **Public Reply** tab, type a reply, and click **Send Message**.
2.  Switch back to the **Customer Portal** tab (Alice). Notice that Charlie's reply appears in the timeline within seconds (via short polling).
3.  Type a reply as **Customer Alice** and click **Send Message**.
4.  Watch the message automatically appear in Charlie's agent timeline window.

### Step 4: Private Internal Notes
1.  In the Agent console (Charlie), click the **Internal Note** tab (highlighted in orange).
2.  Type a private note (e.g. *"Checked stripe logs, user was double billed"*) and click **Add Note**.
3.  Verify the note is rendered on the agent's timeline in yellow.
4.  Look at the Customer Portal (Alice). Verify that **no internal note is visible** (and API requests show notes are completely redacted).

### Step 5: Manager Reassignment & Analytics
1.  Sign out of the Agent console and log in as **Eve** (Manager).
2.  Click the **Workload Analytics** link in the left sidebar navigation. Review agent workloads.
3.  Open the details view for Alice's ticket.
4.  Locate the **Assign Agent** dropdown on the right panel. Choose **Diana Evans**.
5.  Verify the assignee changes to Diana. Diana will now see this ticket inside her **My Workload** queue.

### Step 6: Ticket Resolution & Customer Reopen
1.  As **Agent Diana**, click the **Resolve Ticket** button.
2.  In the modal prompt, type a brief resolution (e.g. *"Refunded secondary transaction. Settled."*) and submit.
3.  Verify that the timeline locks input text fields on both portal screens and shows the resolution banner.
4.  In the Customer Portal (Alice), click **Reopen Request** at the bottom of the feed.
5.  Verify the ticket status reverts to **Requires Attention** and messaging is re-enabled.
