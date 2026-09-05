import React from 'react';
import { type TicketStatus } from '../../types';

interface TicketReplyFormProps {
  status: TicketStatus;
  newReply: string;
  isSending: boolean;
  onReplyChange: (reply: string) => void;
  onSendReply: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReopen: () => void;
}

export const TicketReplyForm: React.FC<TicketReplyFormProps> = ({
  status,
  newReply,
  isSending,
  onReplyChange,
  onSendReply,
  onFileUpload,
  onReopen,
}) => {
  return (
    <div style={styles.chatComposer}>
      {status === 'resolved' ? (
        <div style={styles.resolvedWarning}>
          <p>
            This request has been marked as <strong>Resolved</strong>.
          </p>
          <button
            onClick={onReopen}
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem' }}
            disabled={isSending}
          >
            Reopen Request
          </button>
        </div>
      ) : (
        <form onSubmit={onSendReply} style={styles.composerForm}>
          <textarea
            className="form-control"
            placeholder="Type your message to support... (Press Enter to send, Shift+Enter for newline)"
            rows={3}
            value={newReply}
            onChange={(e) => onReplyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newReply.trim() && !isSending) {
                  onSendReply(e);
                }
              }
            }}
            disabled={isSending}
            style={{ resize: 'none', borderRadius: '8px' }}
          />
          <div style={styles.composerActions}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Press</span>
              <span className="heroui-kbd">Enter ↵</span>
              <span>to send</span>
            </span>
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={onFileUpload}
              disabled={isSending}
            />
            <label
              htmlFor="file-upload"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                height: '36px',
                padding: '0 0.75rem',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: '0.25rem' }}
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Attach File
            </label>
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
  );
};

const styles: Record<string, React.CSSProperties> = {
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resolvedWarning: {
    textAlign: 'center',
    padding: '0.5rem',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
};
