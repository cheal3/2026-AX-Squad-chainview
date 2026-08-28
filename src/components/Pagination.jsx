export const PAGE_SIZE = 10;

export function Pagination({ loading = false, page, pageSize = PAGE_SIZE, selectedCount = 0, setPage, suffix = "", total }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const firstVisiblePage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const visiblePages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstVisiblePage + index
  );
  const start = total ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, total);
  const selectedText = selectedCount ? ` · 선택 ${selectedCount}건` : "";
  const suffixText = suffix ? ` · ${suffix}` : "";
  const moveToPage = (nextPage) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  return (
    <div className="pager">
      <div className="pager__info">
        {loading ? "데이터 조회 중" : `전체 ${total}건 · ${start}-${end} / ${totalPages} 페이지${selectedText}${suffixText}`}
      </div>
      <div className="pager__nav">
        <button aria-label="이전 페이지" disabled={currentPage <= 1} onClick={() => moveToPage(currentPage - 1)} type="button">‹</button>
        {visiblePages.map((pageNumber) => (
          <button
            aria-current={pageNumber === currentPage ? "page" : undefined}
            className={pageNumber === currentPage ? "is-on" : ""}
            key={pageNumber}
            onClick={() => moveToPage(pageNumber)}
            type="button"
          >
            {pageNumber}
          </button>
        ))}
        <button aria-label="다음 페이지" disabled={currentPage >= totalPages} onClick={() => moveToPage(currentPage + 1)} type="button">›</button>
      </div>
    </div>
  );
}
