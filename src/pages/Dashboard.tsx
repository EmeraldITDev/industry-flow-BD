import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmeraldStatCard } from '@/components/dashboard/EmeraldStatCard';
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel';
import { TeamPerformance } from '@/components/dashboard/TeamPerformance';
import { SegmentBreakdown } from '@/components/dashboard/SegmentBreakdown';
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
import { projectsService } from '@/services/projects';
import { FolderKanban, Activity, CheckCircle, Loader2, DollarSign, ShieldAlert, ListChecks, Clock } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { Project } from '@/types';
import { Progress } from '@/components/ui/progress';
import { getStageProgress } from '@/lib/stageProgress';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { formatCurrencyFor } = useCurrency();
  const [chartFilter, setChartFilter] = useState<string | null>(null);
  
  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const computedStats = useMemo(() => {
    const NGN_PER_USD = parseFloat(import.meta.env.VITE_NGN_PER_USD as string) || 800;
    const projects = projectsList || [];
    
    let totalNGN = 0;
    let totalUSD = 0;
    let wonPOValueUSD = 0;
    let wonPOValueNGN = 0;
    let activePipelineUSD = 0;
    let activePipelineNGN = 0;
    let totalCommissionNGN = 0;
    
    const active = projects.filter((p: Project) => p.status === 'active').length;
    const completed = projects.filter((p: Project) => p.status === 'completed').length;
    const won = projects.filter((p: Project) => 
      p.status === 'completed' || 
      p.pipelineStage === 'approval' || 
      p.pipelineStage === 'execution' || 
      p.pipelineStage === 'closure'
    ).length;
    const highRisk = projects.filter((p: Project) => p.dealProbability === 'high' || p.dealProbability === 'critical').length;
    
    // Count unique sectors/segments
    const segments = [...new Set(projects.map(p => p.sector).filter(Boolean))].length;

    projects.forEach((p: Project) => {
      const ngnRaw = Number(p.contractValueNGN ?? 0) || 0;
      const usdRaw = Number(p.contractValueUSD ?? 0) || 0;
      const ngnValue = ngnRaw > 0 ? ngnRaw : (usdRaw > 0 ? Math.round(usdRaw * NGN_PER_USD) : 0);
      const usdValue = usdRaw > 0 ? usdRaw : (ngnRaw > 0 ? parseFloat((ngnRaw / NGN_PER_USD).toFixed(2)) : 0);
      
      totalNGN += ngnValue;
      totalUSD += usdValue;
      
      // Calculate won PO value (approved, executed, or closed deals)
      if (p.status === 'completed' || p.pipelineStage === 'approval' || p.pipelineStage === 'execution' || p.pipelineStage === 'closure') {
        wonPOValueUSD += usdValue;
        wonPOValueNGN += ngnValue;
      }
      
      // Calculate active pipeline value
      if (p.status === 'active') {
        activePipelineUSD += usdValue;
        activePipelineNGN += ngnValue;
      }
      
      // Calculate commission (assuming 5% commission rate - adjust as needed)
      const commissionRate = 0.05;
      totalCommissionNGN += ngnValue * commissionRate;
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
    
    // Calculate win rate
    const winRate = projects.length > 0 ? (won / projects.length) * 100 : 0;
    
    // Calculate pipeline stage distribution
    const pipelineByStage: Record<string, number> = {
      cold: 0,
      initiation: 0,
      qualification: 0,
      proposal: 0,
      negotiation: 0,
      approval: 0,
      execution: 0,
      closure: 0,
    };
    
    // Calculate lost deals (on-hold status, treat as lost for funnel purposes)
    let lostDeals = 0;
    
    projects.forEach((p: Project) => {
      if (p.status === 'on-hold') {
        lostDeals++;
      } else if (p.pipelineStage) {
        pipelineByStage[p.pipelineStage] = (pipelineByStage[p.pipelineStage] || 0) + 1;
      } else {
        // No stage specified, count as cold
        pipelineByStage.cold++;
      }
    });
    
    // Calculate sector/segment distribution
    const bySector: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const sector = p.sector || 'Unknown';
      bySector[sector] = (bySector[sector] || 0) + 1;
    });

    return {
      total: projects.length,
      active,
      completed,
      won,
      highRisk,
      completedTasks,
      overdueTasks,
      totalNGN,
      totalUSD,
      wonPOValueUSD,
      wonPOValueNGN,
      activePipelineUSD,
      activePipelineNGN,
      totalCommissionNGN,
      winRate,
      segments,
      pipelineByStage,
      lostDeals,
      bySector,
      averageProgress: avgProgress,
      recent,
    };
  }, [projectsList]);

  const isLoading = !projectsList;

  const filteredChartProjects = useMemo(() => {
    if (!chartFilter) return projectsList;
    return projectsList.filter((p: Project) => p.status === chartFilter || p.sector === chartFilter);
  }, [projectsList, chartFilter]);
  
  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-1">Overview of projects and tasks</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-accent uppercase tracking-[0.1em]">
          <div className="w-1.5 h-1.5 bg-emerald-accent rounded-full animate-pulse" />
          Live Data
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Section Label */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent">
            <span>Key Performance Indicators</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* KPI Cards - Emerald Style */}
          <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-5">
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
              label="Total Opportunities"
              value={computedStats.total}
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

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-6">
            <StatCard 
              title="Total Projects" 
              value={computedStats.total} 
              icon={FolderKanban}
            />
            <StatCard 
              title="Active Projects" 
              value={computedStats.active} 
              icon={Activity}
            />
            <StatCard 
              title="Completed Projects" 
              value={computedStats.completed} 
              icon={CheckCircle}
            />
            <StatCard 
              title="High Risk Projects" 
              value={computedStats.highRisk} 
              icon={ShieldAlert}
              className={computedStats.highRisk > 0 ? "bg-destructive/5 border-destructive/20" : ""}
            />
            <StatCard 
              title="Completed Tasks" 
              value={computedStats.completedTasks} 
              icon={CheckCircle}
            />
            <StatCard 
              title="Overdue Tasks" 
              value={computedStats.overdueTasks} 
              icon={Clock}
              className={computedStats.overdueTasks > 0 ? "bg-destructive/5 border-destructive/20" : ""}
            />
          </div>

          {/* Pipeline & Revenue Analysis Section */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Pipeline &amp; Revenue Analysis</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline Funnel with Donut */}
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

            {/* Segment Breakdown */}
            <SegmentBreakdown data={computedStats.bySector} />
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

          {/* Average Progress Indicator */}
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
          <DeadlineTracker projects={projectsList} />
          <ProjectCalendar />
          <SectorOverview />
        </div>
      </div>
    </div>
  );
}
