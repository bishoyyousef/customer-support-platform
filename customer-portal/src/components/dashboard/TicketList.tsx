import React from 'react';
import { Link } from 'react-router-dom';
import { type Ticket, type TicketStatus } from '../../types';
import { HighlightText } from '../common/HighlightText';
import { Pagination } from '../common/Pagination';
import { SearchInput } from './SearchInput';
import { FilterPopover } from './FilterPopover';

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
  onClearFilters,
}) => {
  const categories = ['All', 'Billing', 'Technical', 'Account', 'Other'];
  const urgencies = ['All', 'High', 'Medium', 'Low'];
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedCategory !== 'All' || selectedUrgency !== 'All';

  const getStatusText = (status: TicketStatus) => {
    switch (status) {
      case 'requires_attention':
        return 'Waiting on Support';
      case 'under_investigation':
        return 'Under Investigation';
      case 'pending_customer':
        return 'Waiting on You';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  const getUrgencyChipClass = (urgency: 'Low' | 'Medium' | 'High') => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'heroui-chip heroui-chip-danger';
      case 'medium': return 'heroui-chip heroui-chip-warning';
      default: return 'heroui-chip heroui-chip-info';
    }
  };

  const getStatusChipClass = (status: TicketStatus) => {
    switch (status) {
      case 'requires_attention': return 'heroui-chip heroui-chip-danger';
      case 'under_investigation': return 'heroui-chip heroui-chip-info';
      case 'pending_customer': return 'heroui-chip heroui-chip-warning';
      case 'resolved': return 'heroui-chip heroui-chip-success';
      default: return 'heroui-chip heroui-chip-info';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div style={styles.toolbar}>
        <SearchInput searchQuery={searchQuery} onSearchChange={onSearchChange} />
        <FilterPopover
          selectedCategory={selectedCategory}
          selectedUrgency={selectedUrgency}
          searchQuery={searchQuery}
          categories={categories}
          urgencies={urgencies}
          onCategoryChange={onCategoryChange}
          onUrgencyChange={onUrgencyChange}
          onClearFilters={onClearFilters}
        />
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div style={styles.filterBar}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
            Active Filters:
          </span>
          {searchQuery.trim() && (
            <span className="heroui-chip heroui-chip-info" style={{ cursor: 'default' }}>
              Search: "{searchQuery}"
              <button
                type="button"
                onClick={() => onSearchChange('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                &times;
              </button>
            </span>
          )}
          {selectedCategory !== 'All' && (
            <span className="heroui-chip heroui-chip-info" style={{ cursor: 'default' }}>
              Category: {selectedCategory}
              <button
                type="button"
                onClick={() => onCategoryChange('All')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                &times;
              </button>
            </span>
          )}
          {selectedUrgency !== 'All' && (
            <span className="heroui-chip heroui-chip-info" style={{ cursor: 'default' }}>
              Urgency: {selectedUrgency}
              <button
                type="button"
                onClick={() => onUrgencyChange('All')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                &times;
              </button>
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClearFilters}
            style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', height: 'auto' }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Status Tabs Navigation */}
      <div style={styles.tabContainer}>
        <button
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          style={{ ...styles.tab, ...(activeTab === 'active' ? styles.activeTab : {}) }}
          onClick={() => onTabChange('active')}
        >
          Active Requests
        </button>
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          style={{ ...styles.tab, ...(activeTab === 'pending' ? styles.activeTab : {}) }}
          onClick={() => onTabChange('pending')}
        >
          Awaiting Your Reply
        </button>
        <button
          className={`tab-btn ${activeTab === 'resolved' ? 'active' : ''}`}
          style={{ ...styles.tab, ...(activeTab === 'resolved' ? styles.activeTab : {}) }}
          onClick={() => onTabChange('resolved')}
        >
          Resolved History
        </button>
      </div>

      {/* Ticket List Area */}
      <div style={styles.list}>
        {isLoading && tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="card heroui-card" style={styles.emptyCard}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h3 style={styles.emptyTitle}>No support requests found</h3>
            <p style={styles.emptyDesc}>
              {hasActiveFilters
                ? 'Try adjusting your search query or filter options.'
                : activeTab === 'active'
                ? 'You currently have no open active support requests.'
                : activeTab === 'pending'
                ? 'No requests are currently awaiting your input.'
                : 'You have no resolved historical requests.'}
            </p>
          </div>
        ) : (
          <>
            {tickets.map((ticket) => (
              <div key={ticket.id} className="card heroui-card heroui-card-hoverable" style={styles.ticketCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.titleArea}>
                    <span style={styles.refId}>
                      <HighlightText text={ticket.id} query={searchQuery} />
                    </span>
                    <Link to={`/ticket/${ticket.id}`} style={styles.ticketTitle}>
                      <HighlightText text={ticket.title} query={searchQuery} />
                    </Link>
                  </div>
                  <div style={styles.badgeArea}>
                    <span className={getUrgencyChipClass(ticket.urgency)}>
                      <span className="heroui-chip-dot" />
                      {ticket.urgency}
                    </span>
                    <span className={getStatusChipClass(ticket.status)}>
                      <span className={`heroui-chip-dot ${ticket.status === 'requires_attention' ? 'heroui-chip-dot-pulse' : ''}`} />
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.metadata}>
                    Category: <strong>{ticket.category}</strong>
                  </span>
                  <span style={styles.metadata}>
                    Updated: <strong>{formatDate(ticket.updatedAt)}</strong>
                  </span>
                </div>
              </div>
            ))}


            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={onPageChange}
            />
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
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
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
};
