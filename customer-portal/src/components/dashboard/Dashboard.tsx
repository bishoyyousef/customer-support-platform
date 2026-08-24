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

  // Pagination & filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'resolved'>('active');

  // Search debouncing states
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearchVal, setDebouncedSearchVal] = useState('');

  // Summary counts state from backend custom headers
  const [activeCountVal, setActiveCountVal] = useState(0);
  const [pendingCountVal, setPendingCountVal] = useState(0);
  const [resolvedCountVal, setResolvedCountVal] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchVal(searchVal);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const fetchTickets = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let statusQuery = '';
      if (activeTab === 'active') {
        statusQuery = 'requires_attention,under_investigation';
      } else if (activeTab === 'pending') {
        statusQuery = 'pending_customer';
      } else if (activeTab === 'resolved') {
        statusQuery = 'resolved';
      }

      const res = await api.getTickets({
        page: currentPage,
        limit: 10,
        search: debouncedSearchVal,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        status: statusQuery
      });

      setTickets(res.data);

      // Parse custom pagination & summary count headers
      const headerPage = parseInt(res.headers.get('X-Pagination-Page') || '1', 10);
      const headerTotalPages = parseInt(res.headers.get('X-Pagination-Total-Pages') || '1', 10);
      const headerTotalItems = parseInt(res.headers.get('X-Pagination-Total-Count') || '0', 10);
      
      const headerActive = parseInt(res.headers.get('X-Pagination-Active-Count') || '0', 10);
      const headerPending = parseInt(res.headers.get('X-Pagination-Pending-Count') || '0', 10);
      const headerResolved = parseInt(res.headers.get('X-Pagination-Resolved-Count') || '0', 10);

      setCurrentPage(headerPage);
      setTotalPages(headerTotalPages);
      setTotalItems(headerTotalItems);
      setActiveCountVal(headerActive);
      setPendingCountVal(headerPending);
      setResolvedCountVal(headerResolved);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve support requests.');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run fetching when query conditions or page changes
  useEffect(() => {
    fetchTickets();
  }, [currentPage, debouncedSearchVal, selectedCategory, activeTab]);

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
          <SummaryCards 
            activeCountVal={activeCountVal} 
            pendingCountVal={pendingCountVal} 
            resolvedCountVal={resolvedCountVal} 
          />
          <TicketList 
            tickets={tickets} 
            isLoading={isLoading} 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            searchQuery={searchVal}
            selectedCategory={selectedCategory}
            activeTab={activeTab}
            onPageChange={setCurrentPage}
            onSearchChange={setSearchVal}
            onCategoryChange={(cat) => { setSelectedCategory(cat); setCurrentPage(1); }}
            onTabChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }}
          />
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
