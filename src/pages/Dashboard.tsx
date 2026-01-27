import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectorOverview } from '@/components/dashboard/SectorOverview';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { TasksSummary } from '@/components/dashboard/TasksSummary';
import { RevenueAnalytics } from '@/components/dashboard/RevenueAnalytics';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { projectsService } from '@/services/projects';
import { tasksService } from '@/services/tasks';
import { FolderKanban, Activity, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { useCurrency } from '@/context/CurrencyContext';

export default function Dashboard() {
  const { currency, formatCurrency, getContractValue, getMarginValue } = useCurrency();
  
  // Fetch projects and tasks to compute stats client-side
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => tasksService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Compute stats from actual data
  const stats = useMemo(() => {
    const projectList = Array.isArray(projects) ? projects : [];
    const taskList = Array.isArray(tasks) ? tasks : [];
    const now = new Date();

    // Financial calculations
    const wonStages: string[] = ['approval', 'execution', 'closure'];
    const pipelineStages: string[] = ['initiation', 'qualification', 'proposal', 'negotiation'];
    
    // Pipeline Value: Sum of contract values for deals in progress (not won/closed)
    const pipelineValue = projectList
      .filter(p => pipelineStages.includes(p.pipelineStage))
      .reduce((sum, p) => sum + getContractValue(p), 0);
    
    // Sales Revenue: Sum of contract values for won/closed deals
    const salesRevenue = projectList
      .filter(p => wonStages.includes(p.pipelineStage))
      .reduce((sum, p) => sum + getContractValue(p), 0);
    
    // Total Margin/Commission: Sum of margin values across all projects
    const totalMargin = projectList
      .reduce((sum, p) => sum + getMarginValue(p), 0);

    return {
      totalProjects: projectList.length,
      activeProjects: projectList.filter(p => p.status === 'active').length,
      completedTasks: taskList.filter(t => t.status === 'completed').length,
      pendingTasks: taskList.filter(t => t.status === 'todo' || t.status === 'in-progress' || t.status === 'review').length,
      overdueTasks: taskList.filter(t => {
        if (t.status === 'completed') return false;
        const dueDate = t.dueDate ? new Date(t.dueDate) : null;
        return dueDate && dueDate < now;
      }).length,
      pipelineValue: pipelineValue,
      salesRevenue: salesRevenue,
      totalMargin: totalMargin,
    };
  }, [projects, tasks, currency, getContractValue, getMarginValue]);

  const isLoading = projectsLoading || tasksLoading;
  const error = projectsError || tasksError;

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
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-5">
            <StatCard 
              title="Total Projects" 
              value={stats.totalProjects} 
              icon={FolderKanban}
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
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-3">
            <StatCard 
              title={`Pipeline Value (${currency})`}
              value={formatCurrency(stats.pipelineValue)} 
              icon={TrendingUp}
              className="bg-primary/5 border-primary/20"
            />
            <StatCard 
              title={`Sales Revenue (${currency})`}
              value={formatCurrency(stats.salesRevenue)} 
              icon={DollarSign}
              className="bg-chart-2/5 border-chart-2/20"
            />
            <StatCard 
              title={`Total Margin (${currency})`}
              value={formatCurrency(stats.totalMargin)} 
              icon={Percent}
              className="bg-chart-3/5 border-chart-3/20"
            />
          </div>
        </>
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
