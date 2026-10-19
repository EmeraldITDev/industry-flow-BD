import { useEffect, useMemo, useState } from 'react';

export interface ClientPagination<T> {
  /** Rows to render for the current page (every row when `showAll` is set). */
  pageItems: T[];
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first row on this page (0 when empty). */
  start: number;
  /** 1-based index of the last row on this page. */
  end: number;
  setPage: (page: number) => void;
}

/**
 * Pages an in-memory list so long dashboard lists render a fixed number of rows
 * instead of one DOM row per record. Totals and aggregates should still be
 * computed from the full list by the caller.
 *
 * @param resetKey  page returns to 1 whenever this value changes (e.g. a filter).
 * @param showAll   render every row, e.g. while a PNG/PDF export is captured.
 */
export function useClientPagination<T>(
  items: T[],
  pageSize: number,
  { resetKey, showAll = false }: { resetKey?: unknown; showAll?: boolean } = {}
): ClientPagination<T> {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // Clamp rather than reset so a shrinking list keeps the user near where they were.
  const current = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => (showAll ? items : items.slice((current - 1) * pageSize, current * pageSize)),
    [items, current, pageSize, showAll]
  );

  return {
    pageItems,
    page: current,
    pageCount,
    total,
    start: total === 0 ? 0 : showAll ? 1 : (current - 1) * pageSize + 1,
    end: showAll ? total : Math.min(current * pageSize, total),
    setPage,
  };
}
