import { StatCard } from '@/components/dashboard/StatCard';
import { SectorOverview } from '@/components/dashboard/SectorOverview';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { TasksSummary } from '@/components/dashboard/TasksSummary';
import { RevenueAnalytics } from '@/components/dashboard/RevenueAnalytics';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { getDashboardStats } from '@/data/mockData';
import { FolderKanban, Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const stats = getDashboardStats();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all projects and tasks across sectors</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        />
      </div>

      {/* Revenue Analytics Section */}
      <RevenueAnalytics />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecentProjects />
          <TasksSummary />
        </div>
        <div className="space-y-6">
          <ProjectCalendar />
          <SectorOverview />
        </div>
      </div>
    </div>
  );
}
