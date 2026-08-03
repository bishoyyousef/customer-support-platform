import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export const TicketForm: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Billing');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Low');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Field validation states
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);

  const categories = ['Billing', 'Technical', 'Account', 'Other'];
  const urgencies: Array<'Low' | 'Medium' | 'High'> = ['Low', 'Medium', 'High'];

  const validateFields = (): boolean => {
    let isValid = true;

    // Title Check
    if (!title.trim()) {
      setTitleError('Title is required.');
      isValid = false;
    } else if (title.trim().length < 5) {
      setTitleError('Title must be at least 5 characters.');
      isValid = false;
    } else if (title.trim().length > 100) {
      setTitleError('Title cannot exceed 100 characters.');
      isValid = false;
    } else {
      setTitleError(null);
    }

    // Description Check
    if (!description.trim()) {
      setDescError('Description is required.');
      isValid = false;
    } else if (description.trim().length < 15) {
      setDescError('Description must be at least 15 characters.');
      isValid = false;
    } else if (description.trim().length > 1000) {
      setDescError('Description cannot exceed 1000 characters.');
      isValid = false;
    } else {
      setDescError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateFields()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createTicket({
        title: title.trim(),
        description: description.trim(),
        category,
        urgency,
      });
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="card" style={styles.formCard}>
        <div style={styles.header}>
          <h2>Submit a Support Request</h2>
          <p style={styles.subtitle}>Describe the issue you are experiencing, and a support employee will assist you.</p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-title">Subject / Title</label>
            <input
              type="text"
              id="ticket-title"
              className={`form-control ${titleError ? 'error' : ''}`}
              placeholder="e.g. Can't access monthly invoice PDF"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              disabled={isSubmitting}
            />
            {titleError && <div className="form-error-msg">{titleError}</div>}
          </div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
              <label className="form-label" htmlFor="ticket-category">Category</label>
              <select
                id="ticket-category"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
              <label className="form-label">Urgency Level</label>
              <div style={styles.radioGroup}>
                {urgencies.map(u => (
                  <label key={u} style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="urgency"
                      value={u}
                      checked={urgency === u}
                      onChange={() => setUrgency(u)}
                      disabled={isSubmitting}
                      style={styles.radioInput}
                    />
                    <span style={styles.radioText}>{u}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ticket-description">Describe the Issue</label>
            <textarea
              id="ticket-description"
              className={`form-control ${descError ? 'error' : ''}`}
              rows={6}
              placeholder="Provide context, error messages, and reproduction steps (minimum 15 characters)..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (descError) setDescError(null);
              }}
              disabled={isSubmitting}
              style={{ resize: 'vertical' }}
            />
            {descError && <div className="form-error-msg">{descError}</div>}
            <div style={styles.charCount}>
              {description.trim().length} / 1000 characters
            </div>
          </div>

          <div style={styles.actionRow}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '680px',
    margin: '0 auto',
  },
  formCard: {
    padding: '2rem 2.5rem',
  },
  header: {
    marginBottom: '1.75rem',
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    marginTop: '0.25rem',
  },
  row: {
    display: 'flex',
    gap: '1.25rem',
    flexWrap: 'wrap',
  },
  radioGroup: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    height: '38px',
  },
  radioLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
  },
  radioInput: {
    accentColor: 'var(--color-primary)',
    marginRight: '0.375rem',
    cursor: 'pointer',
  },
  radioText: {
    color: 'var(--color-text-main)',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    marginTop: '0.25rem',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1.75rem',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1.25rem',
  },
};
