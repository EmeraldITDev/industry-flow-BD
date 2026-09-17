import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Project } from '@/types';

export default function ChairmanView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<ReviewPeriodKey>('last14');
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>(() => loadAccountGroups());
  const [panelKey, setPanelKey] = useState<MetricPanelKey | null>(null);
  const [pipelineCurrency, setPipelineCurrency] = useState<'USD' | 'NGN'>('USD');

  const allowed = canViewExecutive(user);

  const {
    data: serverData,
    isLoading: serverLoading,
    isFetching: serverFetching,
    isError: serverError,
  } = useQuery({
    queryKey: ['executive-intelligence', period, accountGroups],
    queryFn: () => executiveService.getIntelligence(period, accountGroups),
    staleTime: 60 * 1000,
    enabled: allowed,
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
    const win = resolveReviewWindow(period);
    return buildExecutiveIntelligence(projects as Project[], win, accountGroups, ownerNameFor);
  }, [serverError, projects, period, accountGroups, ownerNameFor]);

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
  const periodFrom = data.window.start
    ? (data.window.start instanceof Date
        ? data.window.start.toISOString().slice(0, 10)
        : String(data.window.start).slice(0, 10))
    : '';
  const periodTo = data.window.end
    ? (data.window.end instanceof Date
        ? data.window.end.toISOString().slice(0, 10)
        : String(data.window.end).slice(0, 10))
    : '';
  const periodQs = periodFrom ? `from=${encodeURIComponent(periodFrom)}&to=${encodeURIComponent(periodTo)}` : '';

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
            Review period: {data.window.label}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={period} onValueChange={(v) => setPeriod(v as ReviewPeriodKey)}>
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
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['executive-intelligence'] })
            }
            aria-label="Refresh"
          >
            <RefreshCw className={isFetching ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </Button>
        </div>
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

      {/* 6. Drivers */}
      <section id="exec-drivers">
        <DriversPanel data={data} />
      </section>

      {/* 7. Movement */}
      <section id="exec-movement">
        <MovementPanel data={data} />
      </section>

      {/* 8. Risk */}
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
