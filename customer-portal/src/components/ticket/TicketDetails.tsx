import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { type Ticket, type Message, type ActivityEvent } from '../../types';

export const TicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
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

    // Setup periodic polling every 5 seconds to simulate live updates
    const interval = setInterval(() => {
      fetchDetails(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    // Scroll to bottom when messages load/change
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages, ticket?.activityTimeline]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !id) return;

    setIsSending(true);
    try {
      await api.postMessage(id, newReply.trim());
      setNewReply('');
      // Refetch detail instantly
      await fetchDetails(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReopen = async () => {
    if (!id) return;
    setIsSending(true);
    try {
      await api.updateTicket(id, { status: 'requires_attention' });
      await fetchDetails(false);
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket.');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'requires_attention': return 'Waiting on Support';
      case 'under_investigation': return 'Under Investigation';
      case 'pending_customer': return 'Waiting on You';
      case 'resolved': return 'Resolved';
      default: return status || '';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + 
        ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
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
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '1.25rem' }}>Back to Dashboard</Link>
      </div>
    );
  }

  // Combine messages and activityTimeline logs into a single chronologically sorted feed
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
            <polyline points="15 18 9 12 15 6"/>
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
            
            <div style={styles.timelineFeed}>
              {timelineFeed.map((item, idx) => {
                if (item.type === 'activity') {
                  const act: ActivityEvent = item.data;
                  return (
                    <div key={`act-${idx}`} style={styles.auditEvent}>
                      <span style={styles.auditText}>{act.message}</span>
                      <span style={styles.auditTime}>{formatDate(act.timestamp)}</span>
                    </div>
                  );
                } else {
                  const msg: Message = item.data;
                  const isOwnMessage = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.msgRow,
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          ...styles.msgBubble,
                          backgroundColor: isOwnMessage ? 'var(--color-primary-light)' : '#ffffff',
                          borderColor: isOwnMessage ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-border)',
                          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span style={styles.msgSender}>{isOwnMessage ? 'You' : msg.senderName}</span>
                        <div style={styles.msgText}>{msg.content}</div>
                        <span style={styles.msgTime}>{formatDate(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                }
              })}
              <div ref={timelineEndRef} />
            </div>

            {/* Input Composer Panel */}
            <div style={styles.chatComposer}>
              {ticket.status === 'resolved' ? (
                <div style={styles.resolvedWarning}>
                  <p>This request has been marked as <strong>Resolved</strong>.</p>
                  <button
                    onClick={handleReopen}
                    className="btn btn-secondary"
                    style={{ marginTop: '0.5rem' }}
                    disabled={isSending}
                  >
                    Reopen Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendReply} style={styles.composerForm}>
                  <textarea
                    className="form-control"
                    placeholder="Type a message to the support team..."
                    rows={3}
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    disabled={isSending}
                    style={{ resize: 'none' }}
                  />
                  <div style={styles.composerActions}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSending || !newReply.trim()}
                    >
                      {isSending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Ticket Details summary sidebar */}
        <div style={styles.detailsPane}>
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
  timelineFeed: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    backgroundColor: '#fafafa',
  },
  msgRow: {
    display: 'flex',
    width: '100%',
  },
  msgBubble: {
    maxWidth: '75%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 1px 0 rgba(0, 0, 0, 0.02)',
  },
  msgSender: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    marginBottom: '0.25rem',
  },
  msgText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-main)',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.4',
  },
  msgTime: {
    fontSize: '0.6875rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.375rem',
  },
  auditEvent: {
    alignSelf: 'center',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    margin: '0.25rem 0',
  },
  auditText: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    backgroundColor: '#f1f5f9',
    padding: '0.25rem 0.625rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  auditTime: {
    fontSize: '0.625rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.125rem',
  },
  chatComposer: {
    padding: '1.25rem',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: '#ffffff',
  },
  composerForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  composerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  resolvedWarning: {
    textAlign: 'center',
    padding: '0.5rem',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  detailsPane: {
    flex: 1,
    minWidth: '260px',
  },
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
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 1.5rem',
    textAlign: 'center',
  },
};
