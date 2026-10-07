import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmeraldStatCard } from '@/components/dashboard/EmeraldStatCard';
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel';
import { SegmentBreakdown } from '@/components/dashboard/SegmentBreakdown';
import { TopClientsByValue } from '@/components/dashboard/TopClientsByValue';
import { ProbabilityMixDonut } from '@/components/dashboard/ProbabilityMixDonut';
import { ProductCategoryMixDonut } from '@/components/dashboard/ProductCategoryMixDonut';
import PipelineBySalesLead from '@/components/dashboard/PipelineBySalesLead';
import TeamOpportunityLoad from '@/components/dashboard/TeamOpportunityLoad';
import { SectorOverview } from '@/components/dashboard/SectorOverview';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { TasksSummary } from '@/components/dashboard/TasksSummary';
import { RevenueAnalytics } from '@/components/dashboard/RevenueAnalytics';
import { DeadlineTracker } from '@/components/dashboard/DeadlineTracker';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { DashboardExportProvider } from '@/context/DashboardExportContext';
import { DashboardVisualExport } from '@/components/dashboard/DashboardVisualExport';
import { useDashboardCurrencyFormat } from '@/hooks/useDashboardCurrencyFormat';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { DashboardFilters, DashboardFilterState, defaultDashboardFilters, applyDashboardFilters } from '@/components/dashboard/DashboardFilters';
import { PartnerTrackerInsights } from '@/components/partners/PartnerTrackerInsights';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { FolderKanban, Loader2, DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Project, PIPELINE_STAGES } from '@/types';
import { Progress } from '@/components/ui/progress';
import { getStageProgress } from '@/lib/stageProgress';
import { useAuth } from '@/context/AuthContext';
import { isRestrictedExecutiveUser } from '@/lib/executive/access';
import { isWon } from '@/lib/executive/analytics';
import {
  buildFinancialSnapshotModel,
  COMMISSION_RATE,
  coverageLine,
  FinancialPanelKey,
} from '@/lib/executive/financialPanel';
import { ExecutiveSnapshotSheet } from '@/components/executive/ExecutiveSnapshotSheet';
import {
  projectsDrillHref,
  resolveLeadIds,
} from '@/lib/dashboard/projectsDrillHref';
import { businessVerticals } from '@/data/mockData';

export default function Dashboard() {
  const { formatCurrencyFor } = useDashboardCurrencyFormat();
  const { user } = useAuth();
  const isRestrictedExecutive = isRestrictedExecutiveUser(user);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilterState>(defaultDashboardFilters);
  const [financialPanelKey, setFinancialPanelKey] = useState<FinancialPanelKey | null>(null);
  const queryClient = useQueryClient();
  
  const { data: projectsList = [], isFetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['projectStats'] });
  };

  // Apply dashboard filters
  const filteredProjects = useMemo(() => {
    return applyDashboardFilters(projectsList, dashboardFilters, teamMembers);
  }, [projectsList, dashboardFilters, teamMembers]);

  const computedStats = useMemo(() => {
    const projects = filteredProjects || [];
    const stored = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };

    // Build team name lookup
    const teamNameMap = new Map<string, string>();
    teamMembers.forEach((m: any) => teamNameMap.set(String(m.id), m.name));
    const resolveLeadName = (p: Project) => {
      if (p.salesLead && typeof p.salesLead === 'string' && p.salesLead.trim()) return p.salesLead.trim();
      const leadId = p.projectLeadId || p.assigneeId;
      if (leadId) return teamNameMap.get(String(leadId)) || 'Unassigned';
      return 'Unassigned';
    };
    
    let totalNGN = 0;
    let totalUSD = 0;
    let wonPOValueUSD = 0;
    let wonPOValueNGN = 0;
    let activePipelineUSD = 0;
    let activePipelineNGN = 0;
    let totalCommissionNGN = 0;
    let totalCommissionUSD = 0;
    let totalMarginNGN = 0;
    let totalMarginUSD = 0;
    let sumMarginPercentUSD = 0;
    let countMarginPercentUSD = 0;
    let sumMarginPercentNGN = 0;
    let countMarginPercentNGN = 0;
    let missingUsdAll = 0;
    let missingNgnAll = 0;
    let missingUsdActive = 0;
    let missingNgnActive = 0;
    let missingUsdWon = 0;
    let withNgnValue = 0;
    let withUsdValue = 0;
    let withMarginPctUSD = 0;
    let withMarginPctNGN = 0;
    
    const active = projects.filter((p: Project) => p.status === 'active').length;
    const completed = projects.filter((p: Project) => p.status === 'completed').length;
    const won = projects.filter((p: Project) => isWon(p)).length;
    const highRisk = projects.filter((p: Project) => p.dealProbability === 'high' || p.dealProbability === 'critical').length;
    
    const segments = [...new Set(projects.map(p => p.sector).filter(Boolean))].length;

    projects.forEach((p: Project) => {
      // Value KPIs use discounted when present, else original. Commission stays on original.
      const ngnValue = stored(
        p.discountedContractValueNGN ?? p.contractValueNGN
      );
      const usdValue = stored(
        p.discountedContractValueUSD ?? p.contractValueUSD
      );
      const originalNgn = stored(p.contractValueNGN);
      const originalUsd = stored(p.contractValueUSD);
      if (!usdValue) missingUsdAll += 1;
      else withUsdValue += 1;
      if (!ngnValue) missingNgnAll += 1;
      else withNgnValue += 1;

      totalNGN += ngnValue;
      totalUSD += usdValue;
      
      // Margin values (stored only — already computed from discounted base when discount set)
      totalMarginNGN += stored(p.marginValueNGN);
      totalMarginUSD += stored(p.marginValueUSD);
      
      // Margin percentages - sum individual project margin %
      const mPctUSD = stored(p.marginPercentUSD);
      const mPctNGN = stored(p.marginPercentNGN);
      if (mPctUSD > 0) { sumMarginPercentUSD += mPctUSD; countMarginPercentUSD++; withMarginPctUSD++; }
      if (mPctNGN > 0) { sumMarginPercentNGN += mPctNGN; countMarginPercentNGN++; withMarginPctNGN++; }
      
      if (isWon(p)) {
        wonPOValueUSD += usdValue;
        wonPOValueNGN += ngnValue;
        if (!usdValue) missingUsdWon += 1;
      }
      
      if (p.status === 'active') {
        activePipelineUSD += usdValue;
        activePipelineNGN += ngnValue;
        if (!usdValue) missingUsdActive += 1;
        if (!ngnValue) missingNgnActive += 1;
      }
      
      const commissionRate = COMMISSION_RATE;
      totalCommissionNGN += originalNgn * commissionRate;
      totalCommissionUSD += originalUsd * commissionRate;
    });

    const avgProgress = projects.length > 0
      ? projects.reduce((sum: number, p: Project) => sum + getStageProgress(p.pipelineStage, p.progress), 0) / projects.length
      : 0;

    let completedTasks = 0;
    let overdueTasks = 0;
    projects.forEach((p: Project) => {
      const tasks = Array.isArray(p.tasks) ? p.tasks : [];
      completedTasks += tasks.filter(t => t.status === 'completed').length;
      overdueTasks += tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    });

    const recent = [...projects]
      .sort((a: any, b: any) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())
      .slice(0, 5);
    
    const winRate = projects.length > 0 ? (won / projects.length) * 100 : 0;
    
    // Single stage query shared by Sales Pipeline Funnel + Pipeline Stage Distribution
    // so counts can never drift between the two widgets.
    const pipelineByStage: Record<string, number> = {
      cold: 0, initiation: 0, qualification: 0, proposal: 0,
      negotiation: 0, approval: 0, execution: 0, closure: 0, lost: 0,
    };
    projects.forEach((p: Project) => {
      const stage = (p.pipelineStage || 'cold').toLowerCase().trim();
      if (stage in pipelineByStage) {
        pipelineByStage[stage] += 1;
      } else {
        pipelineByStage.cold += 1;
      }
    });
    const byPipelineStage = { ...pipelineByStage };
    const lostDeals = pipelineByStage.lost || 0;
    
    const bySector: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const sector = p.sector || 'Other';
      bySector[sector] = (bySector[sector] || 0) + 1;
    });
    
    const clientValues: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const client = p.clientName || 'Unknown';
      if (!client.toUpperCase().includes('BEDS')) {
        const usdValue = Number(p.contractValueUSD ?? 0) || 0;
        clientValues[client] = (clientValues[client] || 0) + usdValue;
      }
    });
    
    const topClients = Object.entries(clientValues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [client, value]) => {
        acc[client] = value;
        return acc;
      }, {} as Record<string, number>);
    
    // Product category mix by opportunity count
    const byProductCategory: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const product = (p.product && p.product.trim()) ? p.product.trim() : null;
      if (!product || product.toLowerCase() === 'nan' || product.toLowerCase() === 'undefined') return;
      byProductCategory[product] = (byProductCategory[product] || 0) + 1;
    });

    // Pipeline by sales lead: one row per account + owner so the opportunity
    // count matches the clientNames ∩ projectLeads drill-down filter.
    const accountTableMap: Record<string, { account: string; location: string; owner: string; count: number }> = {};
    projects.forEach((p: Project) => {
      const client = p.clientName?.trim() || 'Unknown';
      const lead = resolveLeadName(p);
      const loc = p.location?.trim() || '';
      const key = `${client}::${lead}`;
      if (!accountTableMap[key]) {
        accountTableMap[key] = { account: client, location: loc, owner: lead, count: 0 };
      }
      accountTableMap[key].count++;
      if (!accountTableMap[key].location && loc) accountTableMap[key].location = loc;
    });

    const accountTableData = Object.values(accountTableMap).map((info) => ({
      account: info.account,
      location: info.location,
      accountOwner: info.owner,
      totalOpportunities: info.count,
    }));

    // Team load
    const teamLoadMap: Record<string, { total: number; won: number; active: number }> = {};
    projects.forEach((p: Project) => {
      const lead = resolveLeadName(p);
      if (!teamLoadMap[lead]) teamLoadMap[lead] = { total: 0, won: 0, active: 0 };
      teamLoadMap[lead].total++;
      if (isWon(p)) {
        teamLoadMap[lead].won++;
      }
      if (p.status === 'active') teamLoadMap[lead].active++;
    });

    const teamLoad = Object.entries(teamLoadMap).map(([lead, stats]) => ({
      lead, totalDeals: stats.total, won: stats.won, active: stats.active, loadPercentage: stats.total,
    }));

    return {
      total: projects.length, active, completed, won, highRisk,
      completedTasks, overdueTasks,
      totalNGN, totalUSD, wonPOValueUSD, wonPOValueNGN,
      activePipelineUSD, activePipelineNGN,
      totalCommissionNGN, totalCommissionUSD, totalMarginNGN, totalMarginUSD,
      avgMarginPercentUSD: countMarginPercentUSD > 0 ? sumMarginPercentUSD / countMarginPercentUSD : 0,
      avgMarginPercentNGN: countMarginPercentNGN > 0 ? sumMarginPercentNGN / countMarginPercentNGN : 0,
      missingUsdAll, missingNgnAll, missingUsdActive, missingNgnActive, missingUsdWon,
      withNgnValue, withUsdValue, withMarginPctUSD, withMarginPctNGN,
      winRate, segments, pipelineByStage, lostDeals,
      bySector, topClients, byPipelineStage, byProductCategory,
      accountTableData, teamLoad, averageProgress: avgProgress, recent,
    };
  }, [filteredProjects, teamMembers]);

  /** Preserve dashboard filter bar + apply click-triggered overrides → /projects?… */
  const drill = useMemo(() => {
    const base = (overrides: Parameters<typeof projectsDrillHref>[1] = {}) =>
      projectsDrillHref(dashboardFilters, overrides, teamMembers);

    const leadIdsFor = (leadName: string) =>
      resolveLeadIds([leadName], teamMembers);

    return {
      won: base({ metric: 'won' }),
      active: base({ statuses: ['active'] }),
      all: base({}),
      stage: (stage: string) => base({ pipelineStages: [stage] }),
      sector: (sector: string) =>
        (businessVerticals as readonly string[]).includes(sector)
          ? base({ businessVerticals: [sector] })
          : base({ sectors: [sector] }),
      client: (client: string) => base({ clientNames: [client] }),
      product: (product: string) => base({ products: [product] }),
      accountOwner: (account: string, owner: string) =>
        base({
          clientNames: [account],
          projectLeads: leadIdsFor(owner),
        }),
      leadProjects: (lead: string) =>
        base({ projectLeads: leadIdsFor(lead) }),
      leadWon: (lead: string) =>
        base({ metric: 'won', projectLeads: leadIdsFor(lead) }),
      leadActive: (lead: string) =>
        base({ statuses: ['active'], projectLeads: leadIdsFor(lead) }),
    };
  }, [dashboardFilters, teamMembers]);

  const funnelStages = useMemo(
    () =>
      PIPELINE_STAGES.map((s) => ({
        label:
          s.value === 'approval'
            ? 'Approval ✓'
            : s.value === 'lost'
              ? 'Lost ✗'
              : s.label,
        count: computedStats.pipelineByStage[s.value] || 0,
        color: s.value,
        stageKey: s.value,
        href: drill.stage(s.value),
      })),
    [computedStats.pipelineByStage, drill]
  );

  const accountTableWithHrefs = useMemo(
    () =>
      computedStats.accountTableData.map((row) => ({
        ...row,
        href: drill.accountOwner(row.account, row.accountOwner),
      })),
    [computedStats.accountTableData, drill]
  );

  const teamLoadWithHrefs = useMemo(
    () =>
      computedStats.teamLoad.map((row) => ({
        ...row,
        projectsHref: drill.leadProjects(row.lead),
        wonHref: drill.leadWon(row.lead),
        activeHref: drill.leadActive(row.lead),
      })),
    [computedStats.teamLoad, drill]
  );

  const financialPanelModel = useMemo(() => {
    if (!financialPanelKey) return null;
    const headlineFor = (key: FinancialPanelKey): string => {
      switch (key) {
        case 'commission_ngn':
          return formatCurrencyFor(computedStats.totalCommissionNGN, 'NGN');
        case 'commission_usd':
          return formatCurrencyFor(computedStats.totalCommissionUSD, 'USD');
        case 'po_ngn':
          return formatCurrencyFor(computedStats.totalNGN, 'NGN');
        case 'margin_pct_usd':
          return `${computedStats.avgMarginPercentUSD.toFixed(2)}%`;
        case 'margin_pct_ngn':
          return `${computedStats.avgMarginPercentNGN.toFixed(2)}%`;
      }
    };
    return buildFinancialSnapshotModel({
      key: financialPanelKey,
      projects: filteredProjects,
      headline: headlineFor(financialPanelKey),
      filterBaseHref: drill.all,
    });
  }, [financialPanelKey, filteredProjects, computedStats, drill, formatCurrencyFor]);

  const isLoading = !projectsList;
  
  return (
    <DashboardExportProvider>
    <div className="min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <WelcomeHeader />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-accent uppercase tracking-[0.1em]">
            <div className="w-1.5 h-1.5 bg-emerald-accent rounded-full animate-pulse" />
            Live Data
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI Section */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent">
            <span>Key Performance Indicators</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
            <EmeraldStatCard
              label="Total PO Value (USD)"
              value={formatCurrencyFor(computedStats.wonPOValueUSD, 'USD')}
              subtitle={`${computedStats.won} won opportunities`}
              subtitleHref={drill.won}
              colorScheme="won"
              delta="Active"
              note={
                computedStats.missingUsdWon > 0
                  ? `${computedStats.missingUsdWon} project${computedStats.missingUsdWon === 1 ? '' : 's'} have no USD value and are excluded`
                  : undefined
              }
            />
            <EmeraldStatCard
              label="Active Pipeline (USD)"
              value={formatCurrencyFor(computedStats.activePipelineUSD, 'USD')}
              subtitle={`${computedStats.active} open opportunities`}
              subtitleHref={drill.active}
              colorScheme="pipeline"
              note={
                computedStats.missingUsdActive > 0
                  ? `${computedStats.missingUsdActive} project${computedStats.missingUsdActive === 1 ? '' : 's'} have no USD value and are excluded`
                  : undefined
              }
            />
            <EmeraldStatCard
              label="Total Commission (NGN)"
              value={formatCurrencyFor(computedStats.totalCommissionNGN, 'NGN')}
              subtitle={coverageLine(computedStats.withNgnValue, computedStats.total)}
              colorScheme="commission"
              onActivate={() => setFinancialPanelKey('commission_ngn')}
            />
            <EmeraldStatCard
              label="Total Commission (USD)"
              value={formatCurrencyFor(computedStats.totalCommissionUSD, 'USD')}
              subtitle={coverageLine(computedStats.withUsdValue, computedStats.total)}
              colorScheme="commission_usd"
              onActivate={() => setFinancialPanelKey('commission_usd')}
            />
            <EmeraldStatCard
              label="Total Opportunities"
              value={computedStats.total.toLocaleString()}
              subtitle={`${computedStats.segments} business segments`}
              colorScheme="leads"
              href={drill.all}
            />
            <EmeraldStatCard
              label="Win Rate"
              value={`${computedStats.winRate.toFixed(2)}%`}
              subtitle={`${computedStats.won} won / ${computedStats.total} total`}
              colorScheme="rate"
              href={drill.won}
            />
          </div>

          {/* New Summary Cards: Total PO Value NGN, Total Margin USD, Total Margin NGN */}
          <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 md:grid-cols-4 min-w-0">
            <StatCard 
              title="Total Projects" 
              value={computedStats.total.toLocaleString()} 
              icon={FolderKanban}
              href={drill.all}
            />
            <StatCard 
              title="Total PO Value (₦)" 
              value={formatCurrencyFor(computedStats.totalNGN, 'NGN')} 
              icon={DollarSign}
              iconSymbol="₦"
              className="bg-primary/5 border-primary/20"
              description={coverageLine(computedStats.withNgnValue, computedStats.total)}
              onActivate={() => setFinancialPanelKey('po_ngn')}
            />
            <StatCard 
              title="Margin % (USD)" 
              value={`${computedStats.avgMarginPercentUSD.toFixed(2)}%`} 
              icon={DollarSign}
              className="bg-chart-2/5 border-chart-2/20"
              description={
                computedStats.withMarginPctUSD > 0
                  ? coverageLine(computedStats.withMarginPctUSD, computedStats.total)
                  : undefined
              }
              onActivate={() => setFinancialPanelKey('margin_pct_usd')}
            />
            <StatCard 
              title="Margin % (NGN)" 
              value={`${computedStats.avgMarginPercentNGN.toFixed(2)}%`} 
              icon={DollarSign}
              iconSymbol="₦"
              className="bg-chart-3/5 border-chart-3/20"
              description={
                computedStats.withMarginPctNGN > 0
                  ? coverageLine(computedStats.withMarginPctNGN, computedStats.total)
                  : undefined
              }
              onActivate={() => setFinancialPanelKey('margin_pct_ngn')}
            />
          </div>

          {/* Pipeline & Revenue Analysis Section */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Pipeline &amp; Revenue Analysis</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Dashboard Filters */}
          <DashboardFilters
            filters={dashboardFilters}
            onFiltersChange={setDashboardFilters}
            projects={projectsList}
            teamMembers={teamMembers}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            <DashboardVisualExport filename="pipeline-funnel" contentClassName="p-0 bg-transparent border-0 shadow-none min-w-0">
              <PipelineFunnel stages={funnelStages} />
            </DashboardVisualExport>
            <DashboardVisualExport filename="segment-breakdown" contentClassName="p-0 bg-transparent border-0 shadow-none min-w-0">
              <SegmentBreakdown
                data={computedStats.bySector}
                hrefFor={drill.sector}
              />
            </DashboardVisualExport>
          </div>

          {/* Client & Product Analytics */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Client &amp; Product Analytics</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
            <DashboardVisualExport filename="top-clients-by-value" contentClassName="p-0 bg-transparent border-0 shadow-none min-w-0">
              <TopClientsByValue
                data={computedStats.topClients}
                hrefFor={drill.client}
              />
            </DashboardVisualExport>
            <DashboardVisualExport filename="pipeline-stage-distribution" contentClassName="p-0 bg-transparent border-0 shadow-none min-w-0">
              <ProbabilityMixDonut
                data={computedStats.byPipelineStage}
                hrefFor={drill.stage}
              />
            </DashboardVisualExport>
            <DashboardVisualExport filename="product-category-mix" contentClassName="p-0 bg-transparent border-0 shadow-none min-w-0">
              <ProductCategoryMixDonut
                data={computedStats.byProductCategory}
                hrefFor={drill.product}
              />
            </DashboardVisualExport>
          </div>

          {/* Team Performance & Lead Analysis */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Team Performance &amp; Lead Analysis</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            <DashboardVisualExport filename="pipeline-by-sales-lead" contentClassName="p-0 bg-transparent border-0 shadow-none min-w-0">
              <PipelineBySalesLead data={accountTableWithHrefs} />
            </DashboardVisualExport>
            <DashboardVisualExport filename="team-opportunity-load" contentClassName="p-0 bg-transparent border-0 shadow-none min-w-0">
              <TeamOpportunityLoad data={teamLoadWithHrefs} />
            </DashboardVisualExport>
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2 min-w-0">
            <StatCard 
              title="Total Revenue (NGN)"
              value={formatCurrencyFor(computedStats.totalNGN, 'NGN')}
              icon={DollarSign}
              iconSymbol="₦"
              className="bg-primary/5 border-primary/20"
            />
            <StatCard 
              title="Total Revenue (USD)"
              value={formatCurrencyFor(computedStats.totalUSD, 'USD')}
              icon={DollarSign}
              className="bg-chart-2/5 border-chart-2/20"
            />
          </div>

          {/* Average Progress */}
          {computedStats.averageProgress !== undefined && computedStats.averageProgress !== null && (
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-semibold">Average Project Progress</h3>
                <span className="text-sm sm:text-base font-medium">{computedStats.averageProgress.toFixed(1)}%</span>
              </div>
              <Progress value={computedStats.averageProgress} className="h-2 sm:h-3" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Across all active projects</p>
            </div>
          )}
        </>
      )}

      <RevenueAnalytics />

      {/* Partner Tracker (pivot) — distinct from channel_partner text drivers */}
      <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-2">
        <span>Partner Tracker</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 min-w-0">
        <PartnerTrackerInsights />
      </div>

      {/* Bottom Section — restricted executive email does not see task/deadline widgets */}
      <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-3 min-w-0">
        <div className="lg:col-span-2 space-y-3 sm:space-y-6 min-w-0">
          <RecentProjects recentProjects={computedStats.recent} />
          {!isRestrictedExecutive && <TasksSummary />}
        </div>
        <div className="space-y-3 sm:space-y-6 min-w-0">
          {!isRestrictedExecutive && <DeadlineTracker projects={filteredProjects} />}
          {!isRestrictedExecutive && <ProjectCalendar />}
          <SectorOverview />
        </div>
      </div>

      <ExecutiveSnapshotSheet
        open={financialPanelKey !== null}
        onOpenChange={(open) => {
          if (!open) setFinancialPanelKey(null);
        }}
        model={financialPanelModel}
      />
    </div>
    </DashboardExportProvider>
  );
}
