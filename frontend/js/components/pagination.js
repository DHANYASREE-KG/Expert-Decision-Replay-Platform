// ====================================================================
// Expert Decision Replay Platform - Reusable Pagination Component
// ====================================================================

export function paginationControls({ page = 1, pageSize = 10, total = 0, onPageChangeFn = 'changePage' }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return '';

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return `
    <nav class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top" aria-label="Table navigation">
      <small class="text-muted">
        Showing <b>${Math.min((page - 1) * pageSize + 1, total)}</b> to <b>${Math.min(page * pageSize, total)}</b> of <b>${total}</b> records
      </small>
      <div class="btn-group btn-group-sm" role="group">
        <button type="button" class="btn btn-outline-secondary" ${isFirst ? 'disabled' : ''} onclick="${onPageChangeFn}(${page - 1})">
          &larr; Prev
        </button>
        <span class="btn btn-outline-secondary disabled fw-bold text-dark">
          ${page} / ${totalPages}
        </span>
        <button type="button" class="btn btn-outline-secondary" ${isLast ? 'disabled' : ''} onclick="${onPageChangeFn}(${page + 1})">
          Next &rarr;
        </button>
      </div>
    </nav>
  `;
}
