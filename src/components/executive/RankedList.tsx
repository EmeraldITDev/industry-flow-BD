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
}

export function RankedList({
  groups,
  limit = 8,
  filterKey,
  emptyMessage = 'No data recorded for this breakdown.',
  showWon = true,
}: Props) {
  const navigate = useNavigate();
  const visible = groups.slice(0, limit);
  const max = Math.max(...visible.map((g) => g.usd + g.ngn / 1_000_000), 1);

  if (!visible.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((group) => {
        const magnitude = group.usd + group.ngn / 1_000_000;
        const clickable = !!filterKey;
        return (
          <button
            key={group.key}
            type="button"
            disabled={!clickable}
            onClick={
              clickable
                ? () =>
                    navigate(
                      `/projects?${filterKey}=${encodeURIComponent(JSON.stringify([group.label]))}`
                    )
                : undefined
            }
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
              {showWon ? ` · ${group.won} won` : ''} · avg probability{' '}
              {fmtPercent(group.avgProbability)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
