import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { type Ticket, type TicketStatus } from '../../types';

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  searchQuery: string;
  selectedCategory: string;
  selectedUrgency: string;
  activeTab: 'active' | 'pending' | 'resolved';
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
  onUrgencyChange: (urgency: string) => void;
  onTabChange: (tab: 'active' | 'pending' | 'resolved') => void;
  onClearFilters: () => void;
}

const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            style={{
              backgroundColor: 'rgba(250, 204, 21, 0.4)',
              color: 'inherit',
              padding: '0 2px',
              borderRadius: '2px'
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  isLoading,
  currentPage,
  totalPages,
  totalItems,
  searchQuery,
  selectedCategory,
  selectedUrgency,
  activeTab,
  onPageChange,
  onSearchChange,
  onCategoryChange,
  onUrgencyChange,
  onTabChange,
  onClearFilters
}) => {
  const categories = ['All', 'Billing', 'Technical', 'Account', 'Other'];
  const urgencies = ['All', 'High', 'Medium', 'Low'];

  const getStatusText = (status: TicketStatus) => {
    switch (status) {
      case 'requires_attention': return 'Waiting on Support';
      case 'under_investigation': return 'Under Investigation';
      case 'pending_customer': return 'Waiting on You';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: TicketStatus) => {
    return `badge badge-${status}`;
  };

  const getUrgencyBadgeClass = (urgency: 'Low' | 'Medium' | 'High') => {
    return `badge badge-${urgency.toLowerCase()}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + (selectedCategory !== 'All' ? 1 : 0) + (selectedUrgency !== 'All' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchContainer}>
          <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="form-control"
            style={styles.searchInput}
            placeholder="Search by ID, title, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Unified Filter Button & Popover */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowFilterPopover(!showFilterPopover)}
            style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className="badge" style={{ backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '999px', padding: '0.15rem 0.45rem', fontSize: '0.75rem' }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilterPopover && (
            <div className="card" style={{ position: 'absolute', top: '42px', right: 0, zIndex: 100, minWidth: '260px', padding: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>Filter Requests</strong>
                <button type="button" style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={() => setShowFilterPopover(false)}>&times;</button>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>Category</label>
                <select
                  className="form-control"
                  style={{ width: '100%' }}
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>Urgency Priority</label>
                <select
                  className="form-control"
                  style={{ width: '100%' }}
                  value={selectedUrgency}
                  onChange={(e) => onUrgencyChange(e.target.value)}
                >
                  {urgencies.map(u => (
                    <option key={u} value={u}>{u === 'All' ? 'All Urgencies' : `${u} Priority`}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={onClearFilters}>
                  Clear All
                </button>
                <button type="button" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={() => setShowFilterPopover(false)}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Active Filters:</span>
          {searchQuery && (
            <span className="badge" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              Search: "{searchQuery}"
              <span style={{ cursor: 'pointer', marginLeft: '0.25rem' }} onClick={() => onSearchChange('')}>×</span>
            </span>
          )}
          {selectedCategory !== 'All' && (
            <span className="badge" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              Category: {selectedCategory}
              <span style={{ cursor: 'pointer', marginLeft: '0.25rem' }} onClick={() => onCategoryChange('All')}>×</span>
            </span>
          )}
          {selectedUrgency !== 'All' && (
            <span className="badge" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              Urgency: {selectedUrgency}
              <span style={{ cursor: 'pointer', marginLeft: '0.25rem' }} onClick={() => onUrgencyChange('All')}>×</span>
            </span>
          )}
          <button onClick={onClearFilters} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
            Clear All
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => onTabChange('active')}
          style={{ ...styles.tab, ...(activeTab === 'active' ? styles.activeTab : {}) }}
        >
          Active
        </button>
        <button
          onClick={() => onTabChange('pending')}
          style={{ ...styles.tab, ...(activeTab === 'pending' ? styles.activeTab : {}) }}
        >
          Action Required
        </button>
        <button
          onClick={() => onTabChange('resolved')}
          style={{ ...styles.tab, ...(activeTab === 'resolved' ? styles.activeTab : {}) }}
        >
          Resolved
        </button>
      </div>

      {/* List */}
      <div style={styles.list}>
        {isLoading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="card skeleton" style={{ height: '110px', marginBottom: '1rem' }}></div >
            ))}
          </>
        ) : tickets.length === 0 ? (
          <div className="card" style={styles.emptyCard}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <h3 style={styles.emptyTitle}>No support requests found</h3>
            <p style={styles.emptyDesc}>Try adjusting your filters or search query, or submit a new ticket.</p>
          </div>
        ) : (
          <>
            {tickets.map(t => (
              <div key={t.id} className="card" style={styles.ticketCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.titleArea}>
                    <span style={styles.refId}><HighlightText text={t.id} query={searchQuery} /></span>
                    <Link to={`/ticket/${t.id}`} style={styles.ticketTitle}>
                      <HighlightText text={t.title} query={searchQuery} />
                    </Link>
                  </div>
                  <div style={styles.badgeArea}>
                    <span className={getUrgencyBadgeClass(t.urgency)}>{t.urgency} Priority</span>
                    <span className={getStatusBadgeClass(t.status)}>{getStatusText(t.status)}</span>
                  </div>
                </div>
                <div style={styles.cardFooter}>
                  <span style={styles.metadata}>Category: <strong>{t.category}</strong></span>
                  <span style={styles.metadata}>Updated: <strong>{formatDate(t.updatedAt)}</strong></span>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={styles.pageBtn}
                >
                  Previous
                </button>
                <span style={styles.pageInfo}>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (Total: {totalItems} requests)
                </span>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={styles.pageBtn}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '260px',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '2.25rem',
  },
  categorySelect: {
    width: '180px',
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '1.25rem',
  },
  tab: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '0.625rem 1.25rem',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  activeTab: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  ticketCard: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  refId: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-base)',
    padding: '0.125rem 0.375rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  ticketTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
  },
  badgeArea: {
    display: 'flex',
    gap: '0.5rem',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    borderTop: '1px solid var(--color-bg-base)',
    paddingTop: '0.625rem',
  },
  metadata: {
    display: 'inline-flex',
    gap: '0.25rem',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '3rem 1.5rem',
  },
  emptyTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: '600',
    marginTop: '1rem',
    color: 'var(--color-text-main)',
  },
  emptyDesc: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    marginTop: '0.25rem',
    maxWidth: '320px',
  },
  filterBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '2rem',
    flexWrap: 'wrap',
  },
  pageInfo: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  pageBtn: {
    minWidth: '90px',
  }
};
