import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmeraldStatCard } from '@/components/dashboard/EmeraldStatCard';
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel';
import { TeamPerformance } from '@/components/dashboard/TeamPerformance';
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
    const active = projects.filter((p: Project) => p.status === 'active').length;
    const completed = projects.filter((p: Project) => p.status === 'completed').length;
    const highRisk = projects.filter((p: Project) => p.dealProbability === 'high' || p.dealProbability === 'critical').length;

    projects.forEach((p: Project) => {
      const ngnRaw = Number(p.contractValueNGN ?? 0) || 0;
      const usdRaw = Number(p.contractValueUSD ?? 0) || 0;
      totalNGN += ngnRaw > 0 ? ngnRaw : (usdRaw > 0 ? Math.round(usdRaw * NGN_PER_USD) : 0);
      totalUSD += usdRaw > 0 ? usdRaw : (ngnRaw > 0 ? parseFloat((ngnRaw / NGN_PER_USD).toFixed(2)) : 0);
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

    return {
      total: projects.length,
      active,
      completed,
      highRisk,
      completedTasks,
      overdueTasks,
      totalNGN,
      totalUSD,
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
      <div>
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-1">Overview of projects and tasks</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Key Metrics Row */}
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
