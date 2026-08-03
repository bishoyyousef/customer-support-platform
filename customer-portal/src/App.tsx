import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { TicketForm } from './components/ticket/TicketForm';
import { TicketDetails } from './components/ticket/TicketDetails';

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

  return (
    <div style={layoutStyles.wrapper}>
      <header style={layoutStyles.header}>
        <div className="container" style={layoutStyles.headerContainer}>
          <Link to="/" style={layoutStyles.brand}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="var(--color-primary)"/>
            </svg>
            <strong>Customer Support Portal</strong>
          </Link>
          <div style={layoutStyles.userSection}>
            <span style={layoutStyles.userName}>{user?.name}</span>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', height: '32px' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>
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
    backgroundColor: 'var(--color-bg-surface)',
    borderBottom: '1px solid var(--color-border)',
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
