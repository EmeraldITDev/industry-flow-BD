import { useNavigate } from 'react-router-dom';
import { RankedGroup } from '@/lib/executive/analytics';
import { fmtNgn, fmtPercent, fmtUsd } from '@/lib/executive/format';
import { Progress } from '@/components/ui/progress';

interface Props {
  groups: RankedGroup[];
  limit?: number;
  /** Project-list filter key used for drill-down, e.g. clientNames. */
  filterKey?: string;
  emptyMessage?: string;
  showWon?: boolean;
  /** Shared from/to (and similar) appended to every drill-down. */
  extraQuery?: string;
  /** When set, the list drills this metric plus filterKey instead of group.metric. */
  metricOverride?: string;
}

export function RankedList({
  groups,
  limit = 8,
  filterKey,
  emptyMessage = 'No data recorded for this breakdown.',
  showWon = true,
  extraQuery,
  metricOverride,
}: Props) {
  const navigate = useNavigate();
  const visible = groups.slice(0, limit);
  const max = Math.max(...visible.map((g) => g.usd + g.ngn / 1_000_000), 1);

  if (!visible.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }

  const hrefFor = (group: RankedGroup) => {
    const params = new URLSearchParams();
    if (metricOverride) {
      params.set('metric', metricOverride);
      if (filterKey) params.set(filterKey, JSON.stringify([group.label]));
    } else if (group.metric) {
      params.set('metric', group.metric);
    } else if (filterKey) {
      params.set(filterKey, JSON.stringify([group.label]));
    }
    const base = params.toString();
    return extraQuery ? `${base}${base ? '&' : ''}${extraQuery}` : base;
  };

  return (
    <div className="space-y-3">
      {visible.map((group) => {
        const magnitude = group.usd + group.ngn / 1_000_000;
        const href = hrefFor(group);
        const clickable = !!href;
        return (
          <button
            key={group.key}
            type="button"
            disabled={!clickable}
            onClick={clickable ? () => navigate(`/projects?${href}`) : undefined}
            className="w-full text-left rounded-md p-2 hover:bg-muted/50 transition-colors disabled:hover:bg-transparent disabled:cursor-default"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium truncate max-w-[16rem]">{group.label}</span>
              <span className="text-sm tabular-nums flex gap-3">
                {group.usd > 0 && <span className="font-semibold">{fmtUsd(group.usd)}</span>}
                {group.ngn > 0 && <span className="text-muted-foreground">{fmtNgn(group.ngn)}</span>}
              </span>
            </div>
            <Progress value={(magnitude / max) * 100} className="h-1.5 mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(group.count)} opportunities · {group.lateStage} late-stage
              {showWon ? ` · ${group.won} won` : ''}
              {group.avgProbability
                ? ` · avg probability ${fmtPercent(group.avgProbability)}`
                : ''}
              {group.value_share_pct != null && group.record_share_pct != null
                ? ` · ${group.value_share_pct}% of value · ${group.record_share_pct}% of records`
                : ''}
            </p>
          </button>
        );
      })}
    </div>
  );
}
