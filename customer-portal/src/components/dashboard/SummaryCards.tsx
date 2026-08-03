import React from 'react';
import { type Ticket } from '../../types';

interface SummaryCardsProps {
  tickets: Ticket[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ tickets }) => {
  const activeCount = tickets.filter(t => t.status === 'requires_attention' || t.status === 'under_investigation').length;
  const pendingCount = tickets.filter(t => t.status === 'pending_customer').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div style={styles.grid}>
      <div className="card" style={styles.card}>
        <div style={styles.iconContainer}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.48 2 12s4.477 10 10 10z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div style={styles.content}>
          <span style={styles.label}>Active Requests</span>
          <span style={styles.val}>{activeCount}</span>
        </div>
      </div>

      <div className="card" style={styles.card}>
        <div style={styles.iconContainerWarning}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div style={styles.content}>
          <span style={styles.label}>Action Required</span>
          <span style={styles.val}>{pendingCount}</span>
        </div>
      </div>

      <div className="card" style={styles.card}>
        <div style={styles.iconContainerSuccess}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div style={styles.content}>
          <span style={styles.label}>Resolved Requests</span>
          <span style={styles.val}>{resolvedCount}</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary-light)',
    marginRight: '1rem',
  },
  iconContainerWarning: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-warning-light)',
    marginRight: '1rem',
  },
  iconContainerSuccess: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-success-light)',
    marginRight: '1rem',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  val: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    lineHeight: '1.2',
  },
};
