import React, { type RefObject } from 'react';
import { type Message, type ActivityEvent, type User } from '../../types';

interface TicketMessageListProps {
  timelineFeed: Array<{ type: 'message' | 'activity'; timestamp: string; data: any }>;
  user: User | null;
  token: string | null;
  formatDate: (dateStr: string) => string;
  timelineEndRef: RefObject<HTMLDivElement | null>;
}

export const TicketMessageList: React.FC<TicketMessageListProps> = ({
  timelineFeed,
  user,
  token,
  formatDate,
  timelineEndRef,
}) => {
  return (
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
                {msg.attachment && (
                  <div style={styles.attachmentContainer}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ marginRight: '0.25rem' }}
                    >
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <a
                      href={`http://localhost:5000/api/attachments/${msg.attachment.id}?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.attachmentLink}
                    >
                      {msg.attachment.filename} ({Math.round(msg.attachment.size / 1024)} KB)
                    </a>
                  </div>
                )}
                <span style={styles.msgTime}>{formatDate(msg.timestamp)}</span>
              </div>
            </div>
          );
        }
      })}
      <div ref={timelineEndRef} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
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
  attachmentContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '0.25rem',
    marginBottom: '0.25rem',
    backgroundColor: 'var(--color-bg-base)',
    padding: '0.375rem 0.625rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    alignSelf: 'flex-start',
  },
  attachmentLink: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: '500',
  },
};
