import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { type Ticket, type TicketStatus } from '../../types';

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'resolved'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Billing', 'Technical', 'Account', 'Other'];

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

  // Filter logic
  const filteredTickets = tickets.filter(t => {
    // 1. Tab filter
    if (activeTab === 'active' && t.status !== 'requires_attention' && t.status !== 'under_investigation') {
      return false;
    }
    if (activeTab === 'pending' && t.status !== 'pending_customer') {
      return false;
    }
    if (activeTab === 'resolved' && t.status !== 'resolved') {
      return false;
    }

    // 2. Category filter
    if (selectedCategory !== 'All' && t.category !== selectedCategory) {
      return false;
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const idMatch = t.id.toLowerCase().includes(q);
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q) || false;
      return idMatch || titleMatch || descMatch;
    }

    return true;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div>
        <div style={styles.filterBar}>
          <div className="skeleton" style={{ height: '36px', width: '200px' }}></div>
          <div className="skeleton" style={{ height: '36px', width: '120px' }}></div>
        </div>
        <div style={styles.list}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton" style={{ height: '110px', marginBottom: '1rem' }}></div>
          ))}
        </div>
      </div>
    );
  }

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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={styles.categorySelect}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('active')}
          style={{ ...styles.tab, ...(activeTab === 'active' ? styles.activeTab : {}) }}
        >
          Active
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{ ...styles.tab, ...(activeTab === 'pending' ? styles.activeTab : {}) }}
        >
          Action Required
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          style={{ ...styles.tab, ...(activeTab === 'resolved' ? styles.activeTab : {}) }}
        >
          Resolved
        </button>
      </div>

      {/* List */}
      <div style={styles.list}>
        {filteredTickets.length === 0 ? (
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
          filteredTickets.map(t => (
            <div key={t.id} className="card" style={styles.ticketCard}>
              <div style={styles.cardHeader}>
                <div style={styles.titleArea}>
                  <span style={styles.refId}>{t.id}</span>
                  <Link to={`/ticket/${t.id}`} style={styles.ticketTitle}>{t.title}</Link>
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
          ))
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
  }
};
