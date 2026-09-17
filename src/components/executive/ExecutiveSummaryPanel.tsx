import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { normalizeExecutiveSummary } from '@/lib/executive/summary';
import { fmtNgn, fmtUsd } from '@/lib/executive/format';
import { safeFormatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import type { ChairmanAttentionTask } from './RequiresAttentionPanel';

function formatKpiValue(value: number, unit?: string): string {
  if (unit === 'ngn') return fmtNgn(value);
  if (unit === 'usd') return fmtUsd(value);
  return String(Math.round(value));
}

function DirectionIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (direction === 'down') return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function kpiTone(
  direction: 'up' | 'down' | 'flat',
  higherIsWorse?: boolean
): string {
  if (direction === 'flat') return 'text-muted-foreground';
  const favorable = higherIsWorse ? direction === 'down' : direction === 'up';
  return favorable
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-destructive';
}

export function ExecutiveSummaryPanel({
  data,
}: {
  data: ExecutiveIntelligence & { requiresAttention?: ChairmanAttentionTask[] };
}) {
  const navigate = useNavigate();
  const summary = normalizeExecutiveSummary(
    data.summary,
    data.requiresAttention ?? []
  );
  const periodLabel = data.window.label;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Executive Summary</CardTitle>
        <p className="text-xs text-muted-foreground">
          Live signals for {periodLabel.toLowerCase()} — movements and strategic
          account activity share this review window. Chairman attention is
          current open tasks, not a restatement of the cards above.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            KPI movements vs previous period
          </h3>
          {summary.kpiMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Choose a dated review period to see period-over-period movements.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {summary.kpiMovements.map((kpi) => (
                <div
                  key={kpi.key}
                  className="rounded-lg border border-border px-3 py-2.5 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{kpi.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Prior period {formatKpiValue(kpi.previous, kpi.unit)} →{' '}
                      {formatKpiValue(kpi.current, kpi.unit)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1 text-sm font-semibold tabular-nums',
                      kpiTone(kpi.direction, kpi.higherIsWorse)
                    )}
                  >
                    <DirectionIcon direction={kpi.direction} />
                    {kpi.direction === 'flat'
                      ? 'Flat'
                      : `${kpi.delta > 0 ? '+' : '−'}${formatKpiValue(Math.abs(kpi.delta), kpi.unit)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top opportunities requiring attention
          </h3>
          {summary.attentionOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No opportunities currently carry open chairman-flagged tasks.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.attentionOpportunities.map((opp) => (
                <li key={opp.projectId}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border px-3 py-2 text-left hover:border-primary/60"
                    onClick={() => navigate(`/projects/${opp.projectId}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{opp.projectName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {opp.client || 'Unspecified client'}
                          {opp.topTaskTitle ? ` · ${opp.topTaskTitle}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <Badge variant="outline" className="text-[10px]">
                          {opp.openTaskCount} task{opp.openTaskCount === 1 ? '' : 's'}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground">
                          Due {safeFormatDate(opp.earliestDueDate, 'MMM d', '—')}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Chairman-assigned tasks
          </h3>
          {summary.chairmanTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open tasks require chairman intervention.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.chairmanTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border px-3 py-2 text-left hover:border-primary/60"
                    onClick={() =>
                      navigate(
                        task.projectId
                          ? `/projects/${task.projectId}`
                          : '/tasks?requiresChairmanIntervention=1'
                      )
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.projectName || 'Untitled project'}
                          {task.client ? ` · ${task.client}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <Badge variant="outline" className="text-[10px]">
                          {task.priority || '—'}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground">
                          Due {safeFormatDate(task.dueDate, 'MMM d', '—')}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Strategic account updates · last {summary.recentWindowDays} days
          </h3>
          {summary.strategicAccountUpdates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No RFQs, new proposals, or moves into execution on strategic
              accounts in this window.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.strategicAccountUpdates.map((update) => (
                <li key={update.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border px-3 py-2 text-left hover:border-primary/60"
                    onClick={() => navigate(`/projects/${update.projectId}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {update.accountGroupName}
                          </Badge>
                          <span className="text-sm font-medium">{update.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {update.projectName}
                          {update.client ? ` · ${update.client}` : ''}
                          {update.detail ? ` · ${update.detail}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {safeFormatDate(update.occurredAt, 'MMM d', '—')}
                        <ArrowRight className="h-3 w-3 opacity-50" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
