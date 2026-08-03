import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { type Ticket } from '../../types';
import { SummaryCards } from './SummaryCards';
import { TicketList } from './TicketList';

export const Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getTickets();
      setTickets(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve support requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Support Desk</h1>
          <p style={styles.subtitle}>View your active requests or contact our support team.</p>
        </div>
        <Link to="/new-ticket" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Request
        </Link>
      </div>

      {errorMsg ? (
        <div className="card" style={styles.errorCard}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" style={{ marginBottom: '1rem' }}>
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3>Failed to load tickets</h3>
          <p style={styles.errorDesc}>{errorMsg}</p>
          <button onClick={fetchTickets} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Retry Request
          </button>
        </div>
      ) : (
        <>
          <SummaryCards tickets={tickets} />
          <TicketList tickets={tickets} isLoading={isLoading} />
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    marginTop: '0.25rem',
  },
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '3rem 1.5rem',
  },
  errorDesc: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    marginTop: '0.25rem',
    maxWidth: '320px',
  },
};
