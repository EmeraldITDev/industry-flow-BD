import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { executiveService } from '@/services/executive';
import { metricsService } from '@/services/metrics';
import { useAuth } from '@/context/AuthContext';
import { canViewExecutive } from '@/lib/executive/access';
import { AccountGroup, loadAccountGroups } from '@/lib/executive/accountGroups';
import {
  buildExecutiveIntelligence,
  resolveReviewWindow,
  ReviewPeriodKey,
  REVIEW_PERIODS,
} from '@/lib/executive/analytics';
import { fmtDelta, fmtNgn, fmtUsd } from '@/lib/executive/format';
import {
  buildMetricSnapshotModel,
  MetricPanelKey,
  metricPanelQuery,
} from '@/lib/executive/metricPanel';
import { ExecutiveMetric } from '@/components/executive/ExecutiveMetric';
import { ExecutiveSnapshotSheet } from '@/components/executive/ExecutiveSnapshotSheet';
import { QuickQuestions } from '@/components/executive/QuickQuestions';
import { StrategicAccounts } from '@/components/executive/StrategicAccounts';
import { AccountGroupManager } from '@/components/executive/AccountGroupManager';
import { PipelineHealthSection } from '@/components/executive/PipelineHealthSection';
import { ConversionPanel } from '@/components/executive/ConversionPanel';
import { DriversPanel } from '@/components/executive/DriversPanel';
import { MovementPanel } from '@/components/executive/MovementPanel';
import { RiskPanel } from '@/components/executive/RiskPanel';
import { RequiresAttentionPanel } from '@/components/executive/RequiresAttentionPanel';
import { ExecutiveSummaryPanel } from '@/components/executive/ExecutiveSummaryPanel';
import { OpportunityTable } from '@/components/executive/OpportunityTable';
import { PartnerTrackerInsights } from '@/components/partners/PartnerTrackerInsights';
import { Project } from '@/types';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOnly(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return formatLocalDate(value);
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? formatLocalDate(new Date(value));
}

export default function ChairmanView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReviewPeriodKey>('last14');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>(() => loadAccountGroups());
  const [panelKey, setPanelKey] = useState<MetricPanelKey | null>(null);
  const [pipelineCurrency, setPipelineCurrency] = useState<'USD' | 'NGN'>('USD');

  const allowed = canViewExecutive(user);
  const [today] = useState(() => new Date());
  const isCustomPeriod = period === 'custom';
  const customRangeError = isCustomPeriod
    ? !customFrom || !customTo
      ? 'Select both a start date and an end date.'
      : customFrom > customTo
        ? 'The start date must be on or before the end date.'
        : customTo > formatLocalDate(today)
          ? 'The end date cannot be in the future.'
          : ''
    : '';
  const reviewWindow = resolveReviewWindow(
    period,
    period === 'custom'
      ? { from: customFrom, to: customTo }
      : period === 'allTime'
        ? { to: today }
        : undefined,
    today
  );
  const rangeFrom = reviewWindow.start ? formatLocalDate(reviewWindow.start) : undefined;
  const rangeTo = formatLocalDate(reviewWindow.end);
  const usesCustomApiPeriod =
    period === 'last12' ||
    period === 'last24' ||
    period === 'last3Years' ||
    period === 'allTime' ||
    period === 'custom';

  const {
    data: serverData,
    isLoading: serverLoading,
    isFetching: serverFetching,
    isError: serverError,
    refetch: refetchIntelligence,
  } = useQuery({
    queryKey: [
      'executive-intelligence',
      period,
      customFrom,
      customTo,
      rangeFrom,
      rangeTo,
      accountGroups,
    ],
    queryFn: () =>
      executiveService.getIntelligence(
        period,
        accountGroups,
        usesCustomApiPeriod ? { from: rangeFrom, to: rangeTo } : undefined
      ),
    staleTime: 60 * 1000,
    enabled: allowed && !customRangeError,
    retry: 1,
  });

  // Client-side fallback while the backend endpoint is rolling out / unavailable.
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
    enabled: allowed && serverError,
  });

  const { data: team = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 10 * 60 * 1000,
    enabled: allowed && serverError,
  });

  const ownerNameFor = useMemo(() => {
    const map = new Map<string, string>();
    (team as any[]).forEach((m) => map.set(String(m.id), m.name));
    return (p: Project) => {
      if (p.salesLead && p.salesLead.trim()) return p.salesLead.trim();
      const id = p.projectLeadId || p.assigneeId;
      return (id && map.get(String(id))) || 'Unassigned';
    };
  }, [team]);

  const fallbackData = useMemo(() => {
    if (!serverError) return null;
    const win = resolveReviewWindow(
      period,
      period === 'custom'
        ? { from: customFrom, to: customTo }
        : period === 'allTime'
          ? { to: today }
          : undefined,
      today
    );
    return buildExecutiveIntelligence(projects as Project[], win, accountGroups, ownerNameFor);
  }, [serverError, projects, period, customFrom, customTo, accountGroups, ownerNameFor, today]);

  // Prefer live intelligence for panel summary figures (Issue 1 source).
  const liveData = serverData ?? null;
  const data = serverData ?? fallbackData;
  const isLoading = serverLoading || (serverError && projectsLoading);
  const isFetching = serverFetching;

  const panelSpec = panelKey ? metricPanelQuery(panelKey) : null;
  const {
    data: panelPayload,
    isLoading: panelLoading,
    isError: panelError,
  } = useQuery({
    queryKey: ['metric-panel', panelSpec?.metric, panelSpec?.extra],
    enabled: !!panelSpec && !!liveData,
    queryFn: () => metricsService.panel(panelSpec!.metric, panelSpec!.extra),
    staleTime: 60 * 1000,
  });

  const panelModel = useMemo(() => {
    if (!panelKey || !liveData || !panelPayload) return null;
    const revived = {
      ...panelPayload,
      topOpportunities: (panelPayload.topOpportunities ?? []).map((row: any) => ({
        ...row,
        lastActivity: row?.lastActivity ? new Date(row.lastActivity) : null,
      })),
    };
    return buildMetricSnapshotModel(panelKey, liveData, revived, {
      pipelineCurrency: panelKey === 'pipeline' ? pipelineCurrency : undefined,
    });
  }, [panelKey, liveData, panelPayload, pipelineCurrency]);

  const openPanel = (key: MetricPanelKey, currency?: 'USD' | 'NGN') => {
    if (!liveData) {
      const q = metricPanelQuery(key);
      const params = new URLSearchParams({ metric: q.metric, ...q.extra });
      navigate(`/projects?${params.toString()}`);
      return;
    }
    if (key === 'pipeline' && currency) setPipelineCurrency(currency);
    setPanelKey(key);
  };

  if (!allowed) {
    return (
      <Card className="w-full max-w-lg mx-auto mt-12">
        <CardContent className="p-8 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
          <h2 className="font-semibold">Executive View is restricted</h2>
          <p className="text-sm text-muted-foreground">
            This view is available only to the Chairman (`lazarus.angbazo@emeraldcfze.com`).
          </p>
          <Button variant="outline" onClick={() => navigate('/operations')}>
            Back to operations
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isCustomPeriod && customRangeError) {
    return (
      <div className="w-full px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <Card className="mx-auto w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Custom Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={period} onValueChange={(value) => setPeriod(value as ReviewPeriodKey)}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_PERIODS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1 text-sm">
                Start date
                <input
                  type="date"
                  value={customFrom}
                  max={formatLocalDate(today)}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                End date
                <input
                  type="date"
                  value={customTo}
                  max={formatLocalDate(today)}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3"
                />
              </label>
            </div>
            <p role="alert" className="text-sm text-destructive">{customRangeError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const t = data.totals;
  const periodFrom = dateOnly(data.window.start);
  const periodTo = dateOnly(data.window.end);
  const periodQs = periodFrom
    ? `from=${encodeURIComponent(periodFrom)}&to=${encodeURIComponent(periodTo)}`
    : period === 'allTime'
      ? `to=${encodeURIComponent(periodTo)}`
      : '';
  const reviewPeriodDescription = period === 'allTime'
    ? `All available records through ${periodTo}`
    : periodFrom
      ? `${data.window.label}: ${periodFrom} – ${periodTo}`
      : data.window.label;

  return (
    <div className="w-full px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[1400px] space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between pb-6 border-b border-border">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {greeting}, Chairman
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Commercial position as of{' '}
            {new Date().toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {' · '}
            Review period: {reviewPeriodDescription}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as ReviewPeriodKey)}
          >
            <SelectTrigger className="w-[180px] sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_PERIODS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCustomPeriod && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="chairman-period-from">Start date</label>
              <input
                id="chairman-period-from"
                type="date"
                value={customFrom}
                max={formatLocalDate(today)}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <label className="sr-only" htmlFor="chairman-period-to">End date</label>
              <input
                id="chairman-period-to"
                type="date"
                value={customTo}
                max={formatLocalDate(today)}
                onChange={(event) => setCustomTo(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchIntelligence()}
            aria-label="Refresh"
          >
            <RefreshCw className={isFetching ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </Button>
        </div>
        {isCustomPeriod && customRangeError && (
          <p role="alert" className="w-full text-sm text-destructive">
            {customRangeError}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
        >
          <p className="font-semibold">Offline / estimated figures</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
            Live executive intelligence is unavailable. Numbers below are estimated
            from a local project snapshot and may not match drill-down or metrics
            totals. Retry when the connection is healthy.
          </p>
        </div>
      )}

      {/* 1. Commercial position */}
      <section id="exec-overview" className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Active opportunities, pipeline values, and stage distribution are current-position
          snapshots, not historical snapshots for the selected reporting period.
        </p>
        {t.all === 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            No opportunities are available to report.
          </p>
        )}
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ExecutiveMetric
            label="Active opportunities"
            value={String(t.active)}
            sub={`${t.all} recorded in total`}
            tone="primary"
            onActivate={() => openPanel('active')}
          />
          <ExecutiveMetric
            label="Won / in execution"
            value={String(t.won)}
            sub={`${fmtUsd(t.wonUsd)} · ${fmtNgn(t.wonNgn)}`}
            onActivate={() => openPanel('won')}
          />
          <ExecutiveMetric
            label="In negotiation"
            value={String(t.negotiation)}
            drillTo="metric=stage:negotiation"
          />
          <ExecutiveMetric
            label="In proposal"
            value={String(t.proposal)}
            drillTo="metric=stage:proposal"
          />
          <ExecutiveMetric
            label="Pipeline (USD)"
            value={fmtUsd(t.activeUsd)}
            sub="Active opportunities"
            onActivate={() => openPanel('pipeline', 'USD')}
          />
          <ExecutiveMetric
            label="Pipeline (NGN)"
            value={fmtNgn(t.activeNgn)}
            sub="Active opportunities"
            onActivate={() => openPanel('pipeline', 'NGN')}
          />
          <ExecutiveMetric
            label="Late-stage value"
            value={fmtUsd(t.lateStageUsd)}
            sub={`${fmtNgn(t.lateStageNgn)} · ${t.lateStage} opportunities`}
            onActivate={() => openPanel('lateStage')}
          />
          <ExecutiveMetric
            label="High probability"
            value={String(t.high)}
            sub={`${t.high} of ${t.active} active opportunities`}
            onActivate={() => openPanel('highProbability')}
          />
          <ExecutiveMetric
            label="New this period"
            value={String(t.newInPeriod)}
            movement={data.window.prevStart ? fmtDelta(t.newInPeriod, t.newPrevPeriod) : undefined}
            drillTo={periodQs ? `metric=all&${periodQs}` : 'metric=all'}
          />
          <ExecutiveMetric
            label="Won this period"
            value={String(t.wonInPeriod)}
            movement={data.window.prevStart ? fmtDelta(t.wonInPeriod, t.wonPrevPeriod) : undefined}
            drillTo={periodQs ? `metric=won&${periodQs}` : 'metric=won'}
          />
          <ExecutiveMetric
            label="Closed without conversion"
            value={String(t.lost)}
            sub="Recorded as lost"
            tone="muted"
            drillTo={`metric=all&pipelineStages=${encodeURIComponent(JSON.stringify(['lost']))}`}
          />
        </div>

        <ExecutiveSummaryPanel data={data} />
      </section>

      {/* 2. Strategic accounts */}
      <section id="exec-accounts">
        <StrategicAccounts data={data} onManageGroups={() => setGroupManagerOpen(true)} />
      </section>

      <QuickQuestions />

      {/* Requires executive attention — chairman-flagged open tasks only */}
      <section id="exec-attention">
        <RequiresAttentionPanel data={data} />
      </section>

      {/* 3. Pipeline health */}
      <PipelineHealthSection data={data} onOpenStagnant={() => openPanel('stagnant')} />

      {/* 4. Conversion */}
      <section id="exec-conversion">
        <ConversionPanel data={data} />
      </section>

      {/* 5. Near conversion */}
      <section id="exec-near">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Close to Winning</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {data.totals.nearConversion ?? data.nearConversion.length} opportunities
                  prioritised by stage, probability, value and expected close date.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/projects?metric=nearConversion')}
              >
                View all {data.totals.nearConversion ?? data.nearConversion.length}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <OpportunityTable
              rows={data.nearConversion}
              limit={12}
              emptyMessage="No opportunities currently meet the near-conversion criteria."
            />
          </CardContent>
        </Card>
      </section>

      {/* 6. Partner Tracker insights (pivot) — before legacy channel-partner drivers */}
      <section id="exec-partner-tracker" className="space-y-2">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <PartnerTrackerInsights variant="chairman" />
        </div>
      </section>

      {/* 7. Drivers (legacy channel_partner / OEM text — labeled distinctly) */}
      <section id="exec-drivers">
        <DriversPanel data={data} />
      </section>

      {/* 8. Movement */}
      <section id="exec-movement">
        <MovementPanel data={data} />
      </section>

      {/* 9. Risk */}
      <RiskPanel
        data={data}
        onOpenMetric={(metric) => {
          if (metric === 'stagnant') openPanel('stagnant');
          else navigate(`/projects?metric=${encodeURIComponent(metric)}`);
        }}
      />

      <AccountGroupManager
        open={groupManagerOpen}
        onOpenChange={setGroupManagerOpen}
        onSaved={setAccountGroups}
      />

      <ExecutiveSnapshotSheet
        open={panelKey !== null}
        onOpenChange={(open) => {
          if (!open) setPanelKey(null);
        }}
        model={panelModel}
        loading={panelKey !== null && panelLoading}
        error={panelKey !== null && panelError}
        onCurrencyChange={
          panelKey === 'pipeline' ? (c) => setPipelineCurrency(c) : undefined
        }
      />
      </div>
    </div>
  );
}
