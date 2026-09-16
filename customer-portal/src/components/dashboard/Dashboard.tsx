import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { type Ticket } from '../../types';
import { SummaryCards } from './SummaryCards';
import { TicketList } from './TicketList';

export const Dashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination & filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedUrgency, setSelectedUrgency] = useState('All');
  const [selectedSort, setSelectedSort] = useState('createdAt-desc');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'resolved'>('active');

  // Sync query parameters (e.g. ?tab=pending or ?urgency=High)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'active' || tabParam === 'pending' || tabParam === 'resolved') {
      setActiveTab(tabParam);
      setCurrentPage(1);
    }
    const urgencyParam = searchParams.get('urgency');
    if (urgencyParam) {
      setSelectedUrgency(urgencyParam);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Search debouncing states
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearchVal, setDebouncedSearchVal] = useState('');

  // Summary counts state
  const [activeCountVal, setActiveCountVal] = useState(0);
  const [pendingCountVal, setPendingCountVal] = useState(0);
  const [resolvedCountVal, setResolvedCountVal] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchVal(searchVal);
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const fetchTickets = async (showFullLoading = false) => {
    if (showFullLoading) {
      setIsLoading(true);
    }
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

      const [sortField, sortOrder] = selectedSort.split('-');
      const res = await dataService.getTickets({
        page: currentPage,
        limit: 10,
        search: debouncedSearchVal,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        urgency: selectedUrgency === 'All' ? undefined : selectedUrgency,
        status: statusQuery,
        sort: sortField === 'createdAt' ? 'updatedAt' : sortField,
        order: sortOrder
      });

      setTickets(res.items);
      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalCount);

      // Fetch summary counts
      const allRes = await dataService.getTickets({ limit: 1000 });
      const allTickets = allRes.items;
      setActiveCountVal(allTickets.filter(t => t.status === 'requires_attention' || t.status === 'under_investigation').length);
      setPendingCountVal(allTickets.filter(t => t.status === 'pending_customer').length);
      setResolvedCountVal(allTickets.filter(t => t.status === 'resolved').length);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve support requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(tickets.length === 0);
  }, [currentPage, debouncedSearchVal, selectedCategory, selectedUrgency, selectedSort, activeTab]);

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
          <button onClick={() => fetchTickets(true)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
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
            selectedUrgency={selectedUrgency}
            selectedSort={selectedSort}
            activeTab={activeTab}
            onPageChange={setCurrentPage}
            onSearchChange={setSearchVal}
            onCategoryChange={(cat) => { setSelectedCategory(cat); setCurrentPage(1); }}
            onUrgencyChange={(urg) => { setSelectedUrgency(urg); setCurrentPage(1); }}
            onSortChange={(sort) => { setSelectedSort(sort); setCurrentPage(1); }}
            onTabChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }}
            onClearFilters={() => {
              setSearchVal('');
              setSelectedCategory('All');
              setSelectedUrgency('All');
              setSelectedSort('createdAt-desc');
              setCurrentPage(1);
            }}
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
