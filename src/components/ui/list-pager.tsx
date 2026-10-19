import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClientPagination } from '@/hooks/useClientPagination';

interface ListPagerProps {
  pagination: Pick<ClientPagination<unknown>, 'page' | 'pageCount' | 'total' | 'start' | 'end' | 'setPage'>;
  /** Noun for the count line, e.g. "projects". */
  label?: string;
  className?: string;
}

/** Compact "1–10 of 402" pager for lists paged with useClientPagination. Hidden when one page. */
export function ListPager({ pagination, label = 'items', className }: ListPagerProps) {
  const { page, pageCount, total, start, end, setPage } = pagination;
  if (pageCount <= 1 || end - start + 1 >= total) return null;

  return (
    <div
      className={cn('flex items-center justify-between gap-2 pt-2 text-[10px] sm:text-xs text-muted-foreground', className)}
    >
      <span className="tabular-nums">
        {start}–{end} of {total} {label}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="tabular-nums px-1">
          {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
