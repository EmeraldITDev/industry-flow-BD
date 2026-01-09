import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectorOverview } from '@/components/dashboard/SectorOverview';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { TasksSummary } from '@/components/dashboard/TasksSummary';
import { RevenueAnalytics } from '@/components/dashboard/RevenueAnalytics';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { getDashboardStats } from '@/data/mockData';
import { projectsService } from '@/services/projects';
import { FolderKanban, Activity, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { DashboardStats } from '@/types';

export default function Dashboard() {
  // Fetch stats from backend
  const { data: backendStats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => projectsService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fallback to mock data if backend unavailable
  const mockStats = getDashboardStats();
  const stats: DashboardStats = backendStats || mockStats;

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
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-5">
          <StatCard 
            title="Total Projects" 
            value={stats.totalProjects} 
            icon={FolderKanban}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard 
            title="Active Projects" 
            value={stats.activeProjects} 
            icon={Activity}
          />
          <StatCard 
            title="Completed Tasks" 
            value={stats.completedTasks} 
            icon={CheckCircle}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard 
            title="Pending Tasks" 
            value={stats.pendingTasks} 
            icon={Clock}
          />
          <StatCard 
            title="Overdue Tasks" 
            value={stats.overdueTasks} 
            icon={AlertTriangle}
            trend={{ value: 3, isPositive: false }}
            className="col-span-2 lg:col-span-1"
          />
        </div>
      )}

      <RevenueAnalytics />

      <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          <RecentProjects />
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
