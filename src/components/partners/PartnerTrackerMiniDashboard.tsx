import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckSquare,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { partnersService } from '@/services/partners';
import { tasksService } from '@/services/tasks';
import { safeFormatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

type Props = {
  onFilterIncomplete?: () => void;
  onFilterZeroLinks?: () => void;
  className?: string;
};

export function PartnerTrackerMiniDashboard({
  onFilterIncomplete,
  onFilterZeroLinks,
  className,
}: Props) {
  const {
    data: metrics,
    isLoading: metricsLoading,
    isFetching: metricsFetching,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['partners-tracker-metrics'],
    queryFn: () => partnersService.getTrackerMetrics(),
    staleTime: 60_000,
  });

  const {
    data: partners = [],
    isLoading: partnersLoading,
    refetch: refetchPartners,
  } = useQuery({
    queryKey: ['partners', 'mini-dashboard'],
    queryFn: () => partnersService.getAll(),
    staleTime: 60_000,
  });

  const {
    data: leanTasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['tasks', 'lean', 'partner-mini-dashboard'],
    queryFn: () => tasksService.getAllLean(),
    staleTime: 60_000,
  });

  const partnerTasks = useMemo(
    () => leanTasks.filter((t) => Boolean(t.partnerId)),
    [leanTasks],
  );

  const openPartnerTasks = useMemo(
    () => partnerTasks.filter((t) => t.status !== 'completed'),
    [partnerTasks],
  );

  const tasksByPartner = useMemo(() => {
    const map = new Map<
      string,
      { partnerId: string; open: number; total: number }
    >();
    for (const task of partnerTasks) {
      const id = String(task.partnerId);
      const cur = map.get(id) ?? { partnerId: id, open: 0, total: 0 };
      cur.total += 1;
      if (task.status !== 'completed') cur.open += 1;
      map.set(id, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.open - a.open || b.total - a.total)
      .slice(0, 5);
  }, [partnerTasks]);

  const partnerNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of partners) map[String(p.id)] = p.companyName;
    return map;
  }, [partners]);

  const recentPartners = useMemo(
    () =>
      [...partners]
        .sort((a, b) => {
          const aT = Date.parse(a.updatedAt || a.createdAt || '') || 0;
          const bT = Date.parse(b.updatedAt || b.createdAt || '') || 0;
          return bT - aT;
        })
        .slice(0, 5),
    [partners],
  );

  const incompleteCount = metrics?.incompleteProfiles.count ?? 0;
  const zeroLinksCount = metrics?.activeWithZeroOpportunities.count ?? 0;
  const topGaps = (metrics?.dataGaps.fields ?? []).slice(0, 4);

  const loading = metricsLoading || partnersLoading || tasksLoading;

  const refresh = () => {
    refetchMetrics();
    refetchPartners();
    refetchTasks();
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Overview</h2>
          <p className="text-xs text-muted-foreground">
            Partner tasks, profile gaps, and recent changes
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={refresh}
          disabled={metricsFetching}
        >
          {metricsFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading overview…
        </div>
      ) : (
        <>
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="p-4 pb-2 space-y-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Tasks per partner
              </CardTitle>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {openPartnerTasks.length}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">
                  open
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {partnerTasks.length} partner task
                {partnerTasks.length === 1 ? '' : 's'} total
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-1.5">
              {tasksByPartner.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No partner tasks yet.
                </p>
              ) : (
                tasksByPartner.map((row) => (
                  <Link
                    key={row.partnerId}
                    to={`/partners/${row.partnerId}?tab=tasks`}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent/60 transition-colors"
                  >
                    <span className="truncate font-medium">
                      {partnerNameById[row.partnerId] || `Partner #${row.partnerId}`}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground text-xs">
                      {row.open} open
                      <span className="mx-1 text-border">·</span>
                      {row.total} total
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2 space-y-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Missing info
              </CardTitle>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {incompleteCount}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">
                  incomplete
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Missing primary contact and/or email
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="flex flex-wrap gap-2">
                {onFilterIncomplete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onFilterIncomplete}
                  >
                    Show incomplete
                  </Button>
                )}
                {onFilterZeroLinks && zeroLinksCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onFilterZeroLinks}
                  >
                    {zeroLinksCount} active · 0 links
                  </Button>
                )}
              </div>
              {topGaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No gap inventory yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {topGaps.map((gap) => (
                    <li
                      key={gap.key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate text-muted-foreground">
                        {gap.label}
                      </span>
                      <Badge variant="secondary" className="tabular-nums text-xs">
                        {gap.count}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2 space-y-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-chart-4" />
                Recent updates
              </CardTitle>
              <p className="text-xs text-muted-foreground pt-1">
                Partners changed most recently
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-1.5">
              {recentPartners.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No updates yet.</p>
              ) : (
                recentPartners.map((p) => (
                  <Link
                    key={p.id}
                    to={`/partners/${p.id}`}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent/60 transition-colors"
                  >
                    <span className="truncate font-medium">{p.companyName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {safeFormatDate(
                        p.updatedAt || p.createdAt,
                        'MMM d',
                      )}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="p-4 pb-2 space-y-1">
              <CardTitle className="text-sm font-medium">Partners by business vertical</CardTitle>
              <p className="text-xs text-muted-foreground">
                Each partner is counted once per assigned vertical.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-1">
              {(metrics?.byVertical ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No vertical data recorded.</p>
              ) : (
                metrics?.byVertical.slice(0, 8).map((row) => (
                  <Link
                    key={row.key}
                    to={`/partners?vertical=${encodeURIComponent(row.key)}`}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent/60 transition-colors"
                  >
                    <span className="truncate font-medium">{row.label}</span>
                    <Badge variant="secondary" className="tabular-nums text-xs">{row.count}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2 space-y-1">
              <CardTitle className="text-sm font-medium">Partners by product category</CardTitle>
              <p className="text-xs text-muted-foreground">
                Each partner is counted once per assigned category.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-1">
              {(metrics?.byProductCategory ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No product category data recorded.</p>
              ) : (
                metrics?.byProductCategory.slice(0, 8).map((row) => (
                  <Link
                    key={row.key}
                    to={`/partners?product=${encodeURIComponent(row.key)}`}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent/60 transition-colors"
                  >
                    <span className="truncate font-medium">{row.label}</span>
                    <Badge variant="secondary" className="tabular-nums text-xs">{row.count}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        </>
      )}
    </div>
  );
}
