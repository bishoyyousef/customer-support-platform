import React from 'react';
import { type Ticket } from '../../types';

interface TicketHeaderProps {
  ticket: Ticket;
  getStatusText: (status?: string) => string;
  formatDate: (dateStr: string) => string;
}

export const TicketHeader: React.FC<TicketHeaderProps> = ({
  ticket,
  getStatusText,
  formatDate,
}) => {
  return (
    <div className="card" style={styles.detailsCard}>
      <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Ticket Details
      </h3>

      <div style={styles.metaRow}>
        <span style={styles.metaLabel}>ID</span>
        <strong style={styles.metaValue}>{ticket.id}</strong>
      </div>

      <div style={styles.metaRow}>
        <span style={styles.metaLabel}>Category</span>
        <strong style={styles.metaValue}>{ticket.category}</strong>
      </div>

      <div style={styles.metaRow}>
        <span style={styles.metaLabel}>Urgency</span>
        <span className={`badge badge-${ticket.urgency.toLowerCase()}`}>{ticket.urgency}</span>
      </div>

      <div style={styles.metaRow}>
        <span style={styles.metaLabel}>Status</span>
        <span className={`badge badge-${ticket.status}`}>{getStatusText(ticket.status)}</span>
      </div>

      <div style={styles.metaRow}>
        <span style={styles.metaLabel}>Assigned Agent</span>
        <strong style={styles.metaValue}>{ticket.assignedName || 'Unassigned'}</strong>
      </div>

      <div style={styles.metaRow}>
        <span style={styles.metaLabel}>Created</span>
        <span style={styles.metaTime}>{formatDate(ticket.createdAt)}</span>
      </div>

      {ticket.status === 'resolved' && ticket.resolutionSummary && (
        <div style={styles.resolutionContainer}>
          <span style={styles.metaLabel}>Resolution Summary</span>
          <div style={styles.resolutionText}>{ticket.resolutionSummary}</div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  detailsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 'var(--font-size-sm)',
    borderBottom: '1px solid #f4f4f5',
    paddingBottom: '0.5rem',
  },
  metaLabel: {
    color: 'var(--color-text-muted)',
  },
  metaValue: {
    color: 'var(--color-text-main)',
  },
  metaTime: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  resolutionContainer: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    backgroundColor: 'var(--color-success-light)',
    padding: '0.875rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
  },
  resolutionText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-success)',
    lineHeight: '1.4',
    fontWeight: '500',
  },
};
