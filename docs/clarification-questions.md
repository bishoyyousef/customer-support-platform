# Document Relationship Analysis & Clarification Log

## 1. Requirement Document Analysis

Three specification documents exist for this project:

| Document | Title | Role / Context |
|:---|:---|:---|
| **Document A** | `Frontend Assignment - React and Angular.pdf` | Original assignment document specifying core business requirements, 4-day delivery period, and 8 optional enhancements. |
| **Document B** | `Customer Support Operations Platform.pdf` | Top-level Business Requirements Document (BRD) variant outlining business goals, constraints, and backend suggestions. |
| **Document C** | `Milestone 1 (1).pdf` | Phased delivery document defining the first working foundation (authentication, role separation, route protection, app shells, shared data). |

### Document Relationship Classification

- **Document B relative to Document A**: Document B covers the exact same business domain as Document A with nearly identical structural sections. It introduces explicit expectations for automated tests and mentions Supabase as a suitable shared backend example. Because neither document explicitly states that it supersedes the other, their relationship is classified as **aligned BRD variants**.
- **Document C relative to Document B/A**: Document C is a **phased milestone subset** (Phase 1 / Milestone 1) focusing on establishing authentication, authorization, app shells, and data foundation. Detailed ticket creation, dual-channel messaging, and management features represent subsequent milestone phases.

---

## 2. Terminology & Business State Alignment

The application uses contextual terminology tailored to the target persona while maintaining a single, consistent underlying state model:

| Business Status Code | Customer Portal Wording (React) | Support Workspace Wording (Angular) | Semantic Meaning |
|:---|:---|:---|:---|
| `requires_attention` | **Waiting on Support** | **Requires Attention** | Ticket is pending investigation or reply from support team. |
| `under_investigation` | **Under Investigation** | **Under Investigation** | Support agent has claimed or actively opened investigation. |
| `pending_customer` | **Waiting on You** | **Awaiting Customer** | Support team has responded and is waiting for customer reply. |
| `resolved` | **Resolved** | **Resolved** | Issue has been addressed; resolution summary has been recorded. |

### Engineering Decision

Preserve the contextual wording difference between customer-facing ("Waiting on Support", "Waiting on You") and support-facing ("Requires Attention", "Awaiting Customer") interfaces. The underlying domain model values (`requires_attention`, `pending_customer`) are identical across the database, backend API, and both client applications.

---

## 3. Delivery Expectations & Clarification Log

| Item | Document Source | Current Implementation State | Decision / Clarification |
|:---|:---|:---|:---|
| **Backend Technology** | Doc B mentions Supabase; Doc A requires shared data source. | Express REST API + `db.json` with atomic file write-lock. | Retain Express REST API. Fully meets shared data source requirement without external cloud setup. (See `docs/architecture-decisions.md`). |
| **Automated Testing** | Doc B explicitly lists "Appropriate automated tests". | PowerShell (`api_test.ps1`) & Node (`persistence_test.js`) scripts present. | Automated component and authorization test suites planned for Phase 3–5. (See `docs/testing-strategy.md`). |
| **Milestone 1 Deliverables** | Doc C requests planning documents (questions, models, security approach). | Retrospective decision documentation created in `docs/`. | All required Milestone 1 artifacts provided as retrospective engineering decision records reflecting the implemented application. |
