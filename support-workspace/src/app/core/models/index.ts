export type UserRole = 'customer' | 'agent' | 'manager';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
}

export type TicketStatus = 'requires_attention' | 'under_investigation' | 'pending_customer' | 'resolved';

export interface ActivityEvent {
  type: 'creation' | 'assignment' | 'status_change' | 'reply' | 'note';
  message: string;
  timestamp: string;
  actorName: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  isInternal: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: 'Low' | 'Medium' | 'High';
  status: TicketStatus;
  customerId: string;
  customerName: string;
  assignedTo: string | null;
  assignedName: string | null;
  createdAt: string;
  updatedAt: string;
  resolutionSummary: string | null;
  activityTimeline: ActivityEvent[];
  messages: Message[];
}

export interface AgentWorkload {
  id: string;
  name: string;
  activeCount: number;
  resolvedCount: number;
  workloadPercent: number;
}

export interface SummaryTotals {
  total: number;
  active: number;
  resolved: number;
  pending: number;
  unassigned: number;
  requiresAttention: number;
}

export interface UrgencyBreakdown {
  High: number;
  Medium: number;
  Low: number;
}

export interface ManagerSummary {
  totals: SummaryTotals;
  agentWorkloads: AgentWorkload[];
  urgencyBreakdown: UrgencyBreakdown;
}
