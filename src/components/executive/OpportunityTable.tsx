import { useNavigate } from 'react-router-dom';
import { OpportunityRow } from '@/lib/executive/analytics';
import { fmtDate, fmtNgn, fmtUsd } from '@/lib/executive/format';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

const probabilityTone: Record<string, string> = {
  high: 'bg-primary/15 text-primary border-primary/30',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  rows: OpportunityRow[];
  limit?: number;
  emptyMessage?: string;
  showOwner?: boolean;
}

export function OpportunityTable({
  rows,
  limit = 10,
  emptyMessage = 'No opportunities match this view.',
  showOwner = true,
}: Props) {
  const navigate = useNavigate();
  const visible = rows.slice(0, limit);

  if (!visible.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-border">
      {visible.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => navigate(`/projects/${row.id}`)}
          className="w-full text-left py-3 px-1 hover:bg-muted/50 transition-colors group flex items-start gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm truncate max-w-[22rem]">{row.name}</span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {row.stageLabel}
              </Badge>
              <Badge
                variant="outline"
                className={cn('text-[10px] font-normal capitalize', probabilityTone[row.probability])}
              >
                {row.probability} probability
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {row.client}
              {row.businessVertical ? ` · ${row.businessVertical}` : ''}
              {row.sector ? ` · ${row.sector}` : ''}
              {row.products.length ? ` · ${row.products.join(', ')}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Close {fmtDate(row.expectedCloseDate)}
              {row.daysIdle !== null ? ` · last activity ${row.daysIdle}d ago` : ''}
              {showOwner && row.owner ? ` · ${row.owner}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            {row.usd > 0 && <div className="text-sm font-semibold tabular-nums">{fmtUsd(row.usd)}</div>}
            {row.ngn > 0 && (
              <div className="text-sm font-semibold tabular-nums text-muted-foreground">
                {fmtNgn(row.ngn)}
              </div>
            )}
            {row.usd === 0 && row.ngn === 0 && (
              <div className="text-xs text-muted-foreground">No value recorded</div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 mt-1 group-hover:text-primary shrink-0" />
        </button>
      ))}
    </div>
  );
}
