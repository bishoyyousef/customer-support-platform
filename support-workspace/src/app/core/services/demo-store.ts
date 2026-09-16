import { Ticket, User, ManagerSummary, AgentWorkload, SummaryTotals, UrgencyBreakdown } from '../models';

export const DEMO_STORAGE_KEY = 'support_platform_demo_db';
export const DEMO_SEARCH_HISTORY_KEY = 'support_platform_demo_search_history';

export interface DemoDB {
  users: User[];
  tickets: Ticket[];
}

export const INITIAL_DEMO_USERS: User[] = [
  { id: 'cust_1', username: 'alice', role: 'customer', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 'cust_2', username: 'bob', role: 'customer', name: 'Bob Smith', email: 'bob@example.com' },
  { id: 'agent_1', username: 'agent_charlie', role: 'agent', name: 'Charlie Davis', email: 'charlie@example.com' },
  { id: 'agent_2', username: 'agent_diana', role: 'agent', name: 'Diana Evans', email: 'diana@example.com' },
  { id: 'mgr_1', username: 'manager_eve', role: 'manager', name: 'Eve Foster', email: 'eve@example.com' }
];

export const INITIAL_DEMO_TICKETS: Ticket[] = [
  {
    id: 'TKT-1001',
    title: 'Double charge on billing',
    description: 'I tried to subscribe to premium, but checkout failed while still charging my card. Please reverse the second charge of $49.',
    category: 'Billing',
    urgency: 'High',
    status: 'pending_customer',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'mgr_1',
    assignedName: 'Eve Foster',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-21T15:27:43.839Z',
    resolutionSummary: null,
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-03T10:00:00.000Z', actorName: 'Alice Johnson' },
      { type: 'assignment', message: 'Assigned to Charlie Davis', timestamp: '2026-08-03T11:00:00.000Z', actorName: 'Charlie Davis' },
      { type: 'status_change', message: 'Status updated to pending_customer', timestamp: '2026-08-21T15:25:18.467Z', actorName: 'Eve Foster' }
    ],
    messages: [
      { id: 'msg_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: 'I tried to subscribe to premium, but checkout failed while still charging my card. Please reverse the second charge of $49.', timestamp: '2026-08-03T10:00:00.000Z', isInternal: false },
      { id: 'msg_2', senderId: 'agent_1', senderName: 'Charlie Davis', senderRole: 'agent', content: 'Looking into this with our billing service details now.', timestamp: '2026-08-03T11:05:00.000Z', isInternal: true },
      { id: 'msg_3', senderId: 'agent_1', senderName: 'Charlie Davis', senderRole: 'agent', content: 'Hi Alice, let me double check our transaction ledger for you.', timestamp: '2026-08-03T11:10:00.000Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-7639',
    title: 'Billing issue again',
    description: 'I have another invoice concern with my account billing details',
    category: 'Billing',
    urgency: 'Medium',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'agent_2',
    assignedName: 'Diana Evans',
    createdAt: '2026-08-03T18:49:39.570Z',
    updatedAt: '2026-08-03T18:49:39.884Z',
    resolutionSummary: 'Charge reversed and adjusted on standard invoice ledger.',
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-03T18:49:39.570Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_7639_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: 'I have another invoice concern with my account billing details', timestamp: '2026-08-03T18:49:39.570Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-1797',
    title: 'password reset',
    description: "i can't reset my password",
    category: 'Technical',
    urgency: 'Low',
    status: 'requires_attention',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: null,
    assignedName: null,
    createdAt: '2026-08-17T18:04:03.218Z',
    updatedAt: '2026-08-17T18:04:03.218Z',
    resolutionSummary: null,
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-17T18:04:03.218Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_1797_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: "i can't reset my password", timestamp: '2026-08-17T18:04:03.218Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-4000',
    title: 'change password',
    description: "i can't change my password",
    category: 'Technical',
    urgency: 'Medium',
    status: 'resolved',
    customerId: 'cust_1',
    customerName: 'Alice Johnson',
    assignedTo: 'agent_1',
    assignedName: 'Charlie Davis',
    createdAt: '2026-08-17T18:05:03.464Z',
    updatedAt: '2026-08-17T18:09:38.620Z',
    resolutionSummary: 'Issue resolved by assisting customer with security link.',
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Alice Johnson', timestamp: '2026-08-17T18:05:03.464Z', actorName: 'Alice Johnson' }
    ],
    messages: [
      { id: 'msg_4000_1', senderId: 'cust_1', senderName: 'Alice Johnson', senderRole: 'customer', content: "i can't change my password", timestamp: '2026-08-17T18:05:03.464Z', isInternal: false }
    ]
  },
  {
    id: 'TKT-2002',
    title: 'Account upgrade inquiry',
    description: 'Interested in upgrading our enterprise seats plan',
    category: 'Account',
    urgency: 'Medium',
    status: 'under_investigation',
    customerId: 'cust_2',
    customerName: 'Bob Smith',
    assignedTo: 'agent_2',
    assignedName: 'Diana Evans',
    createdAt: '2026-08-18T09:12:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    resolutionSummary: null,
    activityTimeline: [
      { type: 'creation', message: 'Ticket created by Bob Smith', timestamp: '2026-08-18T09:12:00.000Z', actorName: 'Bob Smith' }
    ],
    messages: [
      { id: 'msg_2002_1', senderId: 'cust_2', senderName: 'Bob Smith', senderRole: 'customer', content: 'Interested in upgrading our enterprise seats plan', timestamp: '2026-08-18T09:12:00.000Z', isInternal: false }
    ]
  }
];

export function getDemoDB(): DemoDB {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fallback
  }

  const defaultDB: DemoDB = {
    users: INITIAL_DEMO_USERS,
    tickets: INITIAL_DEMO_TICKETS,
  };
  saveDemoDB(defaultDB);
  return defaultDB;
}

export function saveDemoDB(db: DemoDB): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
}

export function calculateManagerSummary(db: DemoDB): ManagerSummary {
  const tickets = db.tickets;
  const agents = db.users.filter(u => u.role === 'agent' || u.role === 'manager');

  const total = tickets.length;
  const active = tickets.filter(t => t.status !== 'resolved').length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const pending = tickets.filter(t => t.status === 'pending_customer').length;
  const unassigned = tickets.filter(t => !t.assignedTo).length;
  const requiresAttention = tickets.filter(t => t.status === 'requires_attention').length;

  const totals: SummaryTotals = {
    total,
    active,
    resolved,
    pending,
    unassigned,
    requiresAttention,
  };

  const activeAssignedCount = tickets.filter(t => t.assignedTo && t.status !== 'resolved').length;

  const agentWorkloads: AgentWorkload[] = agents.map(agent => {
    const activeCount = tickets.filter(t => t.assignedTo === agent.id && t.status !== 'resolved').length;
    const resolvedCount = tickets.filter(t => t.assignedTo === agent.id && t.status === 'resolved').length;
    const workloadPercent = activeAssignedCount > 0 ? (activeCount / activeAssignedCount) * 100 : 0;

    return {
      id: agent.id,
      name: agent.name,
      activeCount,
      resolvedCount,
      workloadPercent: Math.round(workloadPercent),
    };
  });

  const urgencyBreakdown: UrgencyBreakdown = {
    High: tickets.filter(t => t.urgency === 'High' && t.status !== 'resolved').length,
    Medium: tickets.filter(t => t.urgency === 'Medium' && t.status !== 'resolved').length,
    Low: tickets.filter(t => t.urgency === 'Low' && t.status !== 'resolved').length,
  };

  return {
    totals,
    agentWorkloads,
    urgencyBreakdown,
  };
}
