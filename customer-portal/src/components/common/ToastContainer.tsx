import React from 'react';
import { useToast } from '../../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '360px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        let bg = 'var(--color-info-light)';
        let border = 'var(--color-info)';
        let textColor = 'var(--color-info)';

        if (toast.type === 'success') {
          bg = 'var(--color-success-light)';
          border = 'var(--color-success)';
          textColor = 'var(--color-success)';
        } else if (toast.type === 'danger') {
          bg = 'var(--color-danger-light)';
          border = 'var(--color-danger)';
          textColor = 'var(--color-danger)';
        } else if (toast.type === 'warning') {
          bg = 'var(--color-warning-light)';
          border = 'var(--color-warning)';
          textColor = 'var(--color-warning)';
        }

        return (
          <div
            key={toast.id}
            role="alert"
            style={{
              pointerEvents: 'auto',
              backgroundColor: bg,
              borderLeft: `4px solid ${border}`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.75rem',
              animation: 'toast-slide 0.2s ease-out',
            }}
          >
            <div>
              {toast.title && (
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: textColor, marginBottom: '0.125rem' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-main)' }}>{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                padding: '0.125rem',
              }}
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};
