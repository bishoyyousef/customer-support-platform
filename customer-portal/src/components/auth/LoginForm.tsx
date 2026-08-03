import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileClick = async (profileUsername: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(profileUsername, 'password');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="var(--color-primary)"/>
            </svg>
          </div>
          <h1>Sign in to Customer Portal</h1>
          <p style={styles.subtitle}>Track and submit your support requests</p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleManualSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder="e.g. alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or sign in as test user</span>
        </div>

        <div style={styles.profileGrid}>
          <button
            type="button"
            className="btn btn-secondary"
            style={styles.profileBtn}
            onClick={() => handleProfileClick('alice')}
            disabled={isSubmitting}
          >
            <span style={styles.avatar}>AJ</span>
            <div style={styles.profileInfo}>
              <span style={styles.profileName}>Alice Johnson</span>
              <span style={styles.profileRole}>Customer</span>
            </div>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={styles.profileBtn}
            onClick={() => handleProfileClick('bob')}
            disabled={isSubmitting}
          >
            <span style={styles.avatar}>BS</span>
            <div style={styles.profileInfo}>
              <span style={styles.profileName}>Bob Smith</span>
              <span style={styles.profileRole}>Customer</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem 1rem',
    backgroundColor: 'var(--color-bg-base)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.75rem',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary-light)',
    marginBottom: '1rem',
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    marginTop: '0.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  submitBtn: {
    width: '100%',
    marginTop: '0.5rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '1.5rem 0',
  },
  dividerText: {
    width: '100%',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  profileGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  profileBtn: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    width: '100%',
    padding: '0.625rem 1rem',
    justifyContent: 'flex-start',
  },
  avatar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    fontWeight: '600',
    fontSize: 'var(--font-size-xs)',
    marginRight: '0.75rem',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  profileName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500',
    color: 'var(--color-text-main)',
    lineHeight: '1.2',
  },
  profileRole: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
};
