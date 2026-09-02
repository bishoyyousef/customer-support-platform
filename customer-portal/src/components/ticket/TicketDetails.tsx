import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { type Ticket } from '../../types';
import { TicketHeader } from './TicketHeader';
import { TicketMessageList } from './TicketMessageList';
import { TicketReplyForm } from './TicketReplyForm';

export const TicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newReply, setNewReply] = useState('');
  const [isSending, setIsSending] = useState(false);

  const timelineEndRef = useRef<HTMLDivElement>(null);

  const fetchDetails = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await api.getTicketDetails(id || '');
      setTicket(data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve ticket details.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails(true);

    const interval = setInterval(() => {
      fetchDetails(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages, ticket?.activityTimeline]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || isSending || !ticket) return;

    setIsSending(true);
    try {
      const updated = await api.addMessage(ticket.id, newReply.trim());
      setTicket(updated);
      setNewReply('');
    } catch (err: any) {
      alert(err.message || 'Failed to send reply. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReopen = async () => {
    if (!ticket || isSending) return;
    setIsSending(true);
    try {
      const updated = await api.addMessage(ticket.id, 'Customer requested to reopen this ticket.');
      setTicket(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;

    setIsSending(true);
    try {
      const updated = await api.uploadAttachment(ticket.id, file);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message || 'File upload failed. Please try again.');
    } finally {
      setIsSending(false);
      e.target.value = '';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'requires_attention':
        return 'Waiting on Support';
      case 'under_investigation':
        return 'Under Investigation';
      case 'pending_customer':
        return 'Waiting on You';
      case 'resolved':
        return 'Resolved';
      default:
        return status || '';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="skeleton" style={{ height: '32px', width: '180px', marginBottom: '1.5rem' }}></div>
        <div style={styles.viewGrid}>
          <div className="card skeleton" style={{ height: '300px', flex: 2 }}></div>
          <div className="card skeleton" style={{ height: '220px', flex: 1 }}></div>
        </div>
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div className="card" style={styles.errorCard}>
        <h3>Failed to load ticket details</h3>
        <p>{errorMsg || 'Ticket not found'}</p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '1.25rem' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const timelineFeed: Array<{ type: 'message' | 'activity'; timestamp: string; data: any }> = [];

  ticket.messages.forEach((msg) => {
    timelineFeed.push({ type: 'message', timestamp: msg.timestamp, data: msg });
  });

  ticket.activityTimeline.forEach((act) => {
    timelineFeed.push({ type: 'activity', timestamp: act.timestamp, data: act });
  });

  timelineFeed.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div>
      <div style={styles.navigation}>
        <Link to="/" style={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div style={styles.viewGrid}>
        {/* Left Side: Ticket Conversation feed */}
        <div style={styles.timelinePane}>
          <div className="card" style={styles.chatCard}>
            <div style={styles.chatHeader}>
              <h3>Conversation Thread</h3>
            </div>

            <TicketMessageList
              timelineFeed={timelineFeed}
              user={user}
              token={token}
              formatDate={formatDate}
              timelineEndRef={timelineEndRef}
            />

            <TicketReplyForm
              status={ticket.status}
              newReply={newReply}
              isSending={isSending}
              onReplyChange={setNewReply}
              onSendReply={handleSendReply}
              onFileUpload={handleFileUpload}
              onReopen={handleReopen}
            />
          </div>
        </div>

        {/* Right Side: Ticket Details summary sidebar */}
        <div style={styles.detailsPane}>
          <TicketHeader ticket={ticket} getStatusText={getStatusText} formatDate={formatDate} />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  navigation: {
    marginBottom: '1.25rem',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500',
    gap: '0.25rem',
  },
  viewGrid: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  timelinePane: {
    flex: 2,
    minWidth: '320px',
  },
  chatCard: {
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    height: '640px',
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '1.25rem',
    borderBottom: '1px solid var(--color-border)',
  },
  detailsPane: {
    flex: 1,
    minWidth: '260px',
  },
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 1.5rem',
    textAlign: 'center',
  },
};
