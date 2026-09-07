import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { TicketForm } from './components/ticket/TicketForm';
import { TicketDetails } from './components/ticket/TicketDetails';
import { CommandPaletteModal } from './components/common/CommandPaletteModal';

// Route Guards
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px', margin: '0 auto 2rem' }}></div>
        <div className="skeleton" style={{ height: '200px', width: '100%' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="skeleton" style={{ height: '300px', width: '400px', margin: '0 auto' }}></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Layout Component
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isCmdOpen, setIsCmdOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('heroui_theme') as 'light' | 'dark') || 'light';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('heroui_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div style={layoutStyles.wrapper}>
      <header className="heroui-glass-header" style={layoutStyles.header}>
        <div className="container" style={layoutStyles.headerContainer}>
          <Link to="/" style={layoutStyles.brand}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="var(--color-primary)"/>
            </svg>
            <strong>Customer Support Portal</strong>
          </Link>
          <div style={layoutStyles.userSection}>
            <button
              id="cmd-palette-trigger"
              onClick={() => setIsCmdOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.625rem', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search</span>
              <span className="heroui-kbd">Ctrl+K</span>
            </button>

            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              style={{ padding: '0.25rem 0.5rem', height: '32px', display: 'inline-flex', alignItems: 'center' }}
              aria-label="Toggle theme mode"
            >
              {theme === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            <span style={layoutStyles.userName}>{user?.name}</span>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', height: '32px' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <CommandPaletteModal isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />
      <main className="container" style={layoutStyles.main}>
        {children}
      </main>
    </div>
  );
};

const layoutStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-base)',
  },
  header: {
    padding: '0.875rem 0',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'var(--color-text-main)',
    fontSize: 'var(--font-size-base)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500',
    color: 'var(--color-text-main)',
  },
  main: {
    flex: 1,
    paddingTop: '2rem',
    paddingBottom: '2rem',
  },
};

export const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginForm />
            </PublicOnlyRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/new-ticket"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TicketForm />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ticket/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TicketDetails />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

import { SocketProvider } from './context/SocketContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <ToastContainer />
          <AppContent />
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;

