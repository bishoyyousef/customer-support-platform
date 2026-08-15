# Support Request Model & Lifecycle

## 1. Ticket Data Schema

The support ticket entity represents the central business object shared across the REST API, React Customer Portal, and Angular Support Workspace.

### TypeScript Interface Definition

```typescript
export type TicketStatus = 'requires_attention' | 'under_investigation' | 'pending_customer' | 'resolved';

export interface ActivityEvent {
  type: 'creation' | 'assignment' | 'status_change' | 'reply' | 'note';
  message: string;
  timestamp: string; // ISO-8601 string
  actorName: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'agent' | 'manager';
  content: string;
  timestamp: string; // ISO-8601 string
  isInternal: boolean; // Must be false for customer-visible messages
}

export interface Ticket {
  id: string; // Unique reference identifier (e.g. TKT-1001)
  title: string; // Length: 5 - 100 characters
  description: string; // Length: 15 - 1000 characters
  category: 'Billing' | 'Technical' | 'Account' | 'Other';
  urgency: 'Low' | 'Medium' | 'High';
  status: TicketStatus;
  customerId: string; // References User.id
  customerName: string;
  assignedTo: string | null; // References User.id or null if unassigned
  assignedName: string | null;
  createdAt: string; // ISO-8601 string
  updatedAt: string; // ISO-8601 string
  resolutionSummary: string | null; // Min 10 characters required when resolved
  activityTimeline: ActivityEvent[]; // Audit trail log
  messages: Message[]; // Dual-channel conversation thread
}
```

---

## 2. Ticket Lifecycle State Machine

```
                   ┌────────────────────────┐
                   │   requires_attention   │◄───────────────────────┐
                   └───────────┬────────────┘                        │
                               │                                     │
                     Claim /   │                                     │ Customer
                   Investigate │                                     │ Reopens
                               ▼                                     │
                   ┌────────────────────────┐                        │
                   │  under_investigation   │                        │
                   └───────────┬────────────┘                        │
                               │                                     │
                      Await    │           Customer Replies          │
                     Customer  │  ┌──────────────────────────────────┤
                               ▼  │                                  │
                   ┌──────────────┴─────────┐                        │
                   │    pending_customer    │                        │
                   └───────────┬────────────┘                        │
                               │                                     │
                       Resolve │ (Requires Resolution Summary >=10)  │
                               ▼                                     │
                   ┌────────────────────────┐                        │
                   │        resolved        ├────────────────────────┘
                   └────────────────────────┘
```

### State Definitions & Transitions

1. **`requires_attention`** (Initial State)
   - Set automatically when a customer submits a new ticket.
   - Also set automatically by the system when a customer replies to an active or resolved ticket.
   - Indicates ticket requires action from an agent.

2. **`under_investigation`**
   - Set when an agent claims an unassigned ticket or manually moves the ticket to active investigation.

3. **`pending_customer`**
   - Set when support requests additional information from the customer.

4. **`resolved`**
   - Set when support completes the ticket work.
   - **Validation Rule**: Backend enforces that `resolutionSummary` must be provided and contain at least 10 characters (and max 1000 characters).
   - Locking behavior: Input composers disabled for agents; customer presented with "Reopen Request" action.

---

## 3. Audit Logging & Dual-Channel Messages

- **Activity Timeline (`activityTimeline`)**: Maintained as an append-only audit trail logging major lifecycle events (`creation`, `assignment`, `status_change`, `reply`, `note`) with actor attribution and ISO timestamps.
- **Messages Thread (`messages`)**: Contains both public customer communications (`isInternal: false`) and private support team notes (`isInternal: true`).
