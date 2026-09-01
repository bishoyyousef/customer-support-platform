import React, { useState } from 'react';

interface FilterPopoverProps {
  selectedCategory: string;
  selectedUrgency: string;
  searchQuery: string;
  categories: string[];
  urgencies: string[];
  onCategoryChange: (category: string) => void;
  onUrgencyChange: (urgency: string) => void;
  onClearFilters: () => void;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  selectedCategory,
  selectedUrgency,
  searchQuery,
  categories,
  urgencies,
  onCategoryChange,
  onUrgencyChange,
  onClearFilters,
}) => {
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedUrgency !== 'All' ? 1 : 0);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setShowFilterPopover(!showFilterPopover)}
        style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
        {activeFilterCount > 0 && (
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              borderRadius: '999px',
              padding: '0.15rem 0.45rem',
              fontSize: '0.75rem',
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {showFilterPopover && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '42px',
            right: 0,
            zIndex: 100,
            minWidth: '260px',
            padding: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: '0.9rem' }}>Filter Requests</strong>
            <button
              type="button"
              style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              onClick={() => setShowFilterPopover(false)}
            >
              &times;
            </button>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>
              Category
            </label>
            <select
              className="form-control"
              style={{ width: '100%' }}
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>
              Urgency Priority
            </label>
            <select
              className="form-control"
              style={{ width: '100%' }}
              value={selectedUrgency}
              onChange={(e) => onUrgencyChange(e.target.value)}
            >
              {urgencies.map((u) => (
                <option key={u} value={u}>
                  {u === 'All' ? 'All Urgencies' : `${u} Priority`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={onClearFilters}
            >
              Clear All
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={() => setShowFilterPopover(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
