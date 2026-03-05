import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmeraldStatCard } from '@/components/dashboard/EmeraldStatCard';
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel';
import { TeamPerformance } from '@/components/dashboard/TeamPerformance';
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
import { ProjectStatusChart } from '@/components/dashboard/ProjectStatusChart';
import { PipelineStageChart } from '@/components/dashboard/PipelineStageChart';
import { RevenueBySectorChart } from '@/components/dashboard/RevenueBySectorChart';
import { TaskCompletionChart } from '@/components/dashboard/TaskCompletionChart';
import { DeadlineTracker } from '@/components/dashboard/DeadlineTracker';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { DashboardFilters, DashboardFilterState, defaultDashboardFilters, applyDashboardFilters } from '@/components/dashboard/DashboardFilters';
import { projectsService } from '@/services/projects';
import { FolderKanban, CheckCircle, Loader2, DollarSign, ListChecks, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { Project } from '@/types';
import { Progress } from '@/components/ui/progress';
import { getStageProgress } from '@/lib/stageProgress';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { formatCurrencyFor } = useCurrency();
  const [chartFilter, setChartFilter] = useState<string | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilterState>(defaultDashboardFilters);
  const queryClient = useQueryClient();
  
  const { data: projectsList = [], isFetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['projectStats'] });
  };

  // Apply dashboard filters
  const filteredProjects = useMemo(() => {
    return applyDashboardFilters(projectsList, dashboardFilters);
  }, [projectsList, dashboardFilters]);

  const computedStats = useMemo(() => {
    const NGN_PER_USD = parseFloat(import.meta.env.VITE_NGN_PER_USD as string) || 800;
    const projects = filteredProjects || [];
    
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
    
    const active = projects.filter((p: Project) => p.status === 'active').length;
    const completed = projects.filter((p: Project) => p.status === 'completed').length;
    const won = projects.filter((p: Project) => 
      p.status === 'completed' || 
      p.pipelineStage === 'approval' || 
      p.pipelineStage === 'execution' || 
      p.pipelineStage === 'closure'
    ).length;
    const highRisk = projects.filter((p: Project) => p.dealProbability === 'high' || p.dealProbability === 'critical').length;
    
    const segments = [...new Set(projects.map(p => p.sector).filter(Boolean))].length;

    projects.forEach((p: Project) => {
      const ngnRaw = Number(p.contractValueNGN ?? 0) || 0;
      const usdRaw = Number(p.contractValueUSD ?? 0) || 0;
      const ngnValue = ngnRaw > 0 ? ngnRaw : (usdRaw > 0 ? Math.round(usdRaw * NGN_PER_USD) : 0);
      const usdValue = usdRaw > 0 ? usdRaw : (ngnRaw > 0 ? parseFloat((ngnRaw / NGN_PER_USD).toFixed(2)) : 0);
      
      totalNGN += ngnValue;
      totalUSD += usdValue;
      
      // Margin values
      totalMarginNGN += Number(p.marginValueNGN ?? 0) || 0;
      totalMarginUSD += Number(p.marginValueUSD ?? 0) || 0;
      
      // Margin percentages - sum individual project margin %
      const mPctUSD = Number(p.marginPercentUSD ?? 0) || 0;
      const mPctNGN = Number(p.marginPercentNGN ?? 0) || 0;
      if (mPctUSD > 0) { sumMarginPercentUSD += mPctUSD; countMarginPercentUSD++; }
      if (mPctNGN > 0) { sumMarginPercentNGN += mPctNGN; countMarginPercentNGN++; }
      
      if (p.status === 'completed' || p.pipelineStage === 'approval' || p.pipelineStage === 'execution' || p.pipelineStage === 'closure') {
        wonPOValueUSD += usdValue;
        wonPOValueNGN += ngnValue;
      }
      
      if (p.status === 'active') {
        activePipelineUSD += usdValue;
        activePipelineNGN += ngnValue;
      }
      
      const commissionRate = 0.05;
      totalCommissionNGN += ngnValue * commissionRate;
      totalCommissionUSD += usdValue * commissionRate;
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
    
    const pipelineByStage: Record<string, number> = {
      cold: 0, initiation: 0, qualification: 0, proposal: 0,
      negotiation: 0, approval: 0, execution: 0, closure: 0,
    };
    
    let lostDeals = 0;
    
    projects.forEach((p: Project) => {
      if (p.status === 'on-hold') {
        lostDeals++;
      } else if (p.pipelineStage) {
        pipelineByStage[p.pipelineStage] = (pipelineByStage[p.pipelineStage] || 0) + 1;
      } else {
        pipelineByStage.cold++;
      }
    });
    
    const bySector: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const sector = p.sector || 'Unknown';
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
    
    // Pipeline stage distribution (for donut)
    const byPipelineStage: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const stage = p.pipelineStage || 'cold';
      byPipelineStage[stage] = (byPipelineStage[stage] || 0) + 1;
    });
    
    // Product category mix by opportunity count
    const byProductCategory: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const product = (p.product && p.product.trim()) ? p.product.trim() : null;
      if (!product || product.toLowerCase() === 'nan' || product.toLowerCase() === 'undefined') return;
      byProductCategory[product] = (byProductCategory[product] || 0) + 1;
    });

    // Pipeline by sales lead: count of projects per lead
    const pipelineBySalesLead: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const lead = p.salesLead || 'Unassigned';
      pipelineBySalesLead[lead] = (pipelineBySalesLead[lead] || 0) + 1;
    });

    // Team load
    const teamLoadMap: Record<string, { total: number; won: number; active: number }> = {};
    projects.forEach((p: Project) => {
      const lead = p.salesLead || 'Unassigned';
      if (!teamLoadMap[lead]) teamLoadMap[lead] = { total: 0, won: 0, active: 0 };
      teamLoadMap[lead].total++;
      if (p.status === 'completed' || p.pipelineStage === 'approval' || p.pipelineStage === 'execution' || p.pipelineStage === 'closure') {
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
      winRate, segments, pipelineByStage, lostDeals,
      bySector, topClients, byPipelineStage, byProductCategory,
      pipelineBySalesLead, teamLoad, averageProgress: avgProgress, recent,
    };
  }, [filteredProjects]);

  const isLoading = !projectsList;
  
  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <WelcomeHeader />
        <div className="flex items-center gap-3">
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

          <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <EmeraldStatCard
              label="Total PO Value (USD)"
              value={formatCurrencyFor(computedStats.wonPOValueUSD, 'USD')}
              subtitle={`${computedStats.won} won opportunities`}
              colorScheme="won"
              delta="Active"
            />
            <EmeraldStatCard
              label="Active Pipeline (USD)"
              value={formatCurrencyFor(computedStats.activePipelineUSD, 'USD')}
              subtitle={`${computedStats.active} open opportunities`}
              colorScheme="pipeline"
            />
            <EmeraldStatCard
              label="Total Commission (NGN)"
              value={formatCurrencyFor(computedStats.totalCommissionNGN, 'NGN')}
              subtitle="Across all segments"
              colorScheme="commission"
            />
            <EmeraldStatCard
              label="Total Commission (USD)"
              value={formatCurrencyFor(computedStats.totalCommissionUSD, 'USD')}
              subtitle="Across all segments"
              colorScheme="commission_usd"
            />
            <EmeraldStatCard
              label="Total Opportunities"
              value={computedStats.total.toLocaleString()}
              subtitle={`${computedStats.segments} business segments`}
              colorScheme="leads"
            />
            <EmeraldStatCard
              label="Win Rate"
              value={`${computedStats.winRate.toFixed(1)}%`}
              subtitle={`${computedStats.won} won / ${computedStats.total} total`}
              colorScheme="rate"
            />
          </div>

          {/* New Summary Cards: Total PO Value NGN, Total Margin USD, Total Margin NGN */}
          <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 md:grid-cols-4">
            <StatCard 
              title="Total Projects" 
              value={computedStats.total.toLocaleString()} 
              icon={FolderKanban}
              href="/projects"
            />
            <StatCard 
              title="Total PO Value (₦)" 
              value={formatCurrencyFor(computedStats.totalNGN, 'NGN')} 
              icon={DollarSign}
              className="bg-primary/5 border-primary/20"
            />
            <StatCard 
              title="Margin % (USD)" 
              value={`${computedStats.avgMarginPercentUSD.toFixed(0)}%`} 
              icon={DollarSign}
              className="bg-chart-2/5 border-chart-2/20"
            />
            <StatCard 
              title="Margin % (NGN)" 
              value={`${computedStats.avgMarginPercentNGN.toFixed(0)}%`} 
              icon={DollarSign}
              className="bg-chart-3/5 border-chart-3/20"
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
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PipelineFunnel
              stages={[
                { label: 'Cold', count: computedStats.pipelineByStage.cold || 0, color: 'cold' },
                { label: 'Initiation', count: computedStats.pipelineByStage.initiation || 0, color: 'initiation' },
                { label: 'Qualification', count: computedStats.pipelineByStage.qualification || 0, color: 'qualification' },
                { label: 'Proposal', count: computedStats.pipelineByStage.proposal || 0, color: 'proposal' },
                { label: 'Negotiation', count: computedStats.pipelineByStage.negotiation || 0, color: 'negotiation' },
                { label: 'Approval ✓', count: computedStats.pipelineByStage.approval || 0, color: 'approval' },
                { label: 'Execution', count: computedStats.pipelineByStage.execution || 0, color: 'execution' },
                { label: 'Closure', count: computedStats.pipelineByStage.closure || 0, color: 'closure' },
                { label: 'Lost ✗', count: computedStats.lostDeals || 0, color: 'lost' },
              ]}
            />
            <SegmentBreakdown data={computedStats.bySector} />
          </div>

          {/* Client & Product Analytics */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Client &amp; Product Analytics</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TopClientsByValue data={computedStats.topClients} />
            <ProbabilityMixDonut data={computedStats.byPipelineStage} />
            <ProductCategoryMixDonut data={computedStats.byProductCategory} />
          </div>

          {/* Team Performance & Lead Analysis */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Team Performance &amp; Lead Analysis</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PipelineBySalesLead 
              data={Object.entries(computedStats.pipelineBySalesLead).map(([lead, value]) => ({
                lead,
                value: value as number,
              }))}
            />
            <TeamOpportunityLoad data={computedStats.teamLoad} />
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2">
            <StatCard 
              title="Total Revenue (NGN)"
              value={formatCurrencyFor(computedStats.totalNGN, 'NGN')}
              icon={DollarSign}
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

      {/* Bottom Section */}
      <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          <RecentProjects recentProjects={computedStats.recent} />
          <TasksSummary />
        </div>
        <div className="space-y-3 sm:space-y-6">
          <DeadlineTracker projects={filteredProjects} />
          <ProjectCalendar />
          <SectorOverview />
        </div>
      </div>
    </div>
  );
}
