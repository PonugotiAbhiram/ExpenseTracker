// src/components/Pagination.jsx

/**
 * Pagination
 *
 * @param {{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }} props
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Build visible page numbers with ellipsis logic
  const getPages = () => {
    const pages = [];
    const delta = 1; // pages on each side of current

    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd   = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);

    if (rangeStart > 2) pages.push("...");

    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

    if (rangeEnd < totalPages - 1) pages.push("...");

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      {/* Prev */}
      <button
        className="pagination-btn pagination-arrow"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </button>

      {/* Page numbers */}
      {getPages().map((page, idx) =>
        page === "..." ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={page}
            className={`pagination-btn${page === currentPage ? " pagination-btn--active" : ""}`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        className="pagination-btn pagination-arrow"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight />
      </button>
    </div>
  );
};

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default Pagination;