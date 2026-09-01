import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
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
  );
};

const styles: Record<string, React.CSSProperties> = {
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
  },
};
