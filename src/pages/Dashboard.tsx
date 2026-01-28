import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectorOverview } from '@/components/dashboard/SectorOverview';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { TasksSummary } from '@/components/dashboard/TasksSummary';
import { RevenueAnalytics } from '@/components/dashboard/RevenueAnalytics';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { projectsService } from '@/services/projects';
import { FolderKanban, Activity, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, TrendingUp, Percent, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/context/CurrencyContext';
import { ProjectStats } from '@/types';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const { currency, formatCurrency } = useCurrency();
  
  // Fetch statistics from API endpoint
  const { data: stats, isLoading, error } = useQuery<ProjectStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => projectsService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  if (error) {
    return (
      <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
        <div>
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-1">Overview of projects and tasks</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive mb-2">Failed to load dashboard data</p>
          <p className="text-muted-foreground text-sm mb-4">
            {(error as any)?.message || 'Please check your connection'}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-1">Overview of projects and tasks</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-6">
            <StatCard 
              title="Total Projects" 
              value={stats.total || stats.totalProjects || 0} 
              icon={FolderKanban}
            />
            <StatCard 
              title="Active Projects" 
              value={stats.active || stats.activeProjects || 0} 
              icon={Activity}
            />
            <StatCard 
              title="Completed Projects" 
              value={stats.completed || stats.completedProjects || 0} 
              icon={CheckCircle}
            />
            <StatCard 
              title="High Risk Projects" 
              value={stats.highRisk || 0} 
              icon={ShieldAlert}
              className={stats.highRisk > 0 ? "bg-destructive/5 border-destructive/20" : ""}
            />
            <StatCard 
              title="Completed Tasks" 
              value={stats.completedTasks || 0} 
              icon={CheckCircle}
            />
            <StatCard 
              title="Overdue Tasks" 
              value={stats.overdueTasks || 0} 
              icon={AlertTriangle}
              className={stats.overdueTasks > 0 ? "bg-destructive/5 border-destructive/20" : ""}
            />
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2">
            <StatCard 
              title={`Total Revenue (NGN)`}
              value={formatCurrency(stats.totalValueNgn || 0)} 
              icon={DollarSign}
              className="bg-primary/5 border-primary/20"
            />
            <StatCard 
              title={`Total Revenue (USD)`}
              value={formatCurrency(stats.totalValueUsd || 0)} 
              icon={DollarSign}
              className="bg-chart-2/5 border-chart-2/20"
            />
          </div>

          {/* Average Progress Indicator */}
          {stats.averageProgress !== undefined && (
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-semibold">Average Project Progress</h3>
                <span className="text-sm sm:text-base font-medium">{stats.averageProgress.toFixed(1)}%</span>
              </div>
              <Progress value={stats.averageProgress} className="h-2 sm:h-3" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Across all active projects</p>
            </div>
          )}
        </>
      ) : null}

      <RevenueAnalytics />

      <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          <RecentProjects recentProjects={stats?.recent} />
          <TasksSummary />
        </div>
        <div className="space-y-3 sm:space-y-6">
          <ProjectCalendar />
          <SectorOverview />
        </div>
      </div>
    </div>
  );
}
