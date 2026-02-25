import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmeraldStatCard } from '@/components/dashboard/EmeraldStatCard';
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel';
import { TeamPerformance } from '@/components/dashboard/TeamPerformance';
import { SectorOverview } from '@/components/dashboard/SectorOverview';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { TasksSummary } from '@/components/dashboard/TasksSummary';
import { RevenueAnalytics } from '@/components/dashboard/RevenueAnalytics';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { projectsService } from '@/services/projects';
import { tasksService } from '@/services/tasks';
import { FolderKanban, Activity, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, TrendingUp, Percent, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/context/CurrencyContext';
import { ProjectStats, Project } from '@/types';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const { currency, formatCurrency, formatCurrencyFor, getContractValue } = useCurrency();
  
  // Also fetch projects so we can compute totals locally as a fallback
  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Compute NGN/USD totals from projects (with conversion) as a fallback if API stats are missing or inaccurate
  const computedTotals = useMemo(() => {
    const NGN_PER_USD = parseFloat(import.meta.env.VITE_NGN_PER_USD as string) || 800;
    let totalNGN = 0;
    let totalUSD = 0;

    (projectsList || []).forEach((p: Project) => {
      const ngnRaw = Number(p.contractValueNGN ?? 0) || 0;
      const usdRaw = Number(p.contractValueUSD ?? 0) || 0;

      // NGN total: prefer NGN, otherwise convert from USD
      totalNGN += ngnRaw > 0 ? ngnRaw : (usdRaw > 0 ? Math.round(usdRaw * NGN_PER_USD) : 0);

      // USD total: prefer USD, otherwise convert from NGN
      totalUSD += usdRaw > 0 ? usdRaw : (ngnRaw > 0 ? parseFloat((ngnRaw / NGN_PER_USD).toFixed(2)) : 0);
    });

    return { totalNGN, totalUSD };
  }, [projectsList]);

  // Fetch statistics from API endpoint with robust fallback
  const { data: stats, isLoading, error } = useQuery<ProjectStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const result = await projectsService.getStats();
        console.log('[Dashboard] Received stats from API:', result);
        
        // Validate API response has required fields
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid API response format');
        }
        
        return result;
      } catch (err) {
        console.error('[Dashboard] Error fetching stats:', err);
        // Return empty stats instead of throwing to prevent UI error
        return {
          total: 0,
          totalProjects: 0,
          active: 0,
          activeProjects: 0,
          completed: 0,
          completedProjects: 0,
          highRisk: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          totalValueNgn: 0,
          totalValueUsd: 0,
          averageProgress: 0,
          byStatus: { active: 0, on_hold: 0, completed: 0, cancelled: 0 },
          byStage: {},
          byAssignee: [],
          recent: [],
        } as ProjectStats;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: 1, // Retry once on failure
  });
  
  // Debug: Log stats when they change
  useEffect(() => {
    if (stats) {
      console.log('[Dashboard] Current stats from API:', stats);
      console.log('[Dashboard] Total Projects:', stats.total || stats.totalProjects);
      console.log('[Dashboard] Active Projects:', stats.active || stats.activeProjects);
      console.log('[Dashboard] Completed Projects:', stats.completed || stats.completedProjects);
      console.log('[Dashboard] Total Value NGN:', stats.totalValueNgn);
      console.log('[Dashboard] Total Value USD:', stats.totalValueUsd);
      console.log('[Dashboard] Completed Tasks:', stats.completedTasks);
      console.log('[Dashboard] Pending Tasks:', stats.pendingTasks);
      console.log('[Dashboard] Overdue Tasks:', stats.overdueTasks);
    }
  }, [stats]);

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

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <>
          {/* Section Label */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent">
            <span>Key Performance Indicators</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* KPI Row - Emerald Style */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-5">
            <EmeraldStatCard
              label="Total Projects"
              value={stats.total ?? stats.totalProjects ?? 0}
              subtitle={`${stats.active ?? stats.activeProjects ?? 0} active`}
              colorScheme="won"
              delta="Active"
            />
            <EmeraldStatCard
              label="Active Pipeline"
              value={stats.active ?? stats.activeProjects ?? 0}
              subtitle="open opportunities"
              colorScheme="pipeline"
            />
            <EmeraldStatCard
              label="Total Revenue (NGN)"
              value={formatCurrencyFor(computedTotals.totalNGN, 'NGN')}
              subtitle="across all projects"
              colorScheme="commission"
            />
            <EmeraldStatCard
              label="Total Revenue (USD)"
              value={formatCurrencyFor(computedTotals.totalUSD, 'USD')}
              subtitle="across all projects"
              colorScheme="leads"
            />
            <EmeraldStatCard
              label="Completion Rate"
              value={`${stats.total > 0 ? ((stats.completed ?? stats.completedProjects ?? 0) / stats.total * 100).toFixed(1) : 0}%`}
              subtitle={`${stats.completed ?? stats.completedProjects ?? 0} / ${stats.total} completed`}
              colorScheme="rate"
            />
          </div>

          {/* Pipeline & Analytics Section */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Pipeline &amp; Revenue Analysis</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline Funnel */}
            <PipelineFunnel
              stages={[
                { label: 'Planning', count: stats.byStatus?.active || 0, color: 'cold' },
                { label: 'Initiation', count: Math.floor((stats.byStatus?.active || 0) * 0.3), color: 'initiation' },
                { label: 'In Progress', count: stats.byStatus?.active || 0, color: 'proposal' },
                { label: 'On Hold', count: stats.byStatus?.on_hold || 0, color: 'negotiation' },
                { label: 'Review', count: Math.floor((stats.byStatus?.active || 0) * 0.1), color: 'qualification' },
                { label: 'Completed ✓', count: stats.completed ?? stats.completedProjects ?? 0, color: 'won' },
                { label: 'Cancelled ✗', count: stats.byStatus?.cancelled || 0, color: 'lost' },
              ]}
            />

            {/* Revenue Analytics (existing component) */}
            <RevenueAnalytics />
          </div>

          {/* Team Performance Section */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-accent mt-8">
            <span>Team Performance &amp; Project Analysis</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Team Performance */}
            <TeamPerformance
              members={
                stats.byAssignee?.slice(0, 6).map(assignee => ({
                  name: assignee.assignee || 'Unassigned',
                  deals: assignee.count || 0,
                  won: Math.floor((assignee.count || 0) * 0.2), // Estimate based on completion rate
                  active: Math.floor((assignee.count || 0) * 0.3), // Estimate
                })) || []
              }
            />

            {/* Tasks Summary */}
            <TasksSummary />
          </div>

          {/* Average Progress Indicator */}
          {stats.averageProgress !== undefined && stats.averageProgress !== null && (
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-semibold">Average Project Progress</h3>
                <span className="text-sm sm:text-base font-medium">{stats.averageProgress.toFixed(1)}%</span>
              </div>
              <Progress value={stats.averageProgress} className="h-2 sm:h-3" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Across all active projects</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-2">No statistics available</p>
          <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          <RecentProjects recentProjects={stats?.recent} />
        </div>
        <div className="space-y-3 sm:space-y-6">
          <ProjectCalendar />
          <SectorOverview />
        </div>
      </div>
    </div>
  );
}
