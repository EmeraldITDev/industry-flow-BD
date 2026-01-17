import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isSameDay, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock, CheckSquare, FolderKanban } from 'lucide-react';
import { projectsService } from '@/services/projects';
import { tasksService } from '@/services/tasks';
import { Link } from 'react-router-dom';

interface DeadlineItem {
  id: string;
  name: string;
  dueDate: Date;
  type: 'project' | 'task';
  projectId?: string;
  projectName?: string;
  sector?: string;
  priority?: string;
  status?: string;
}

export function ProjectCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Fetch projects from API
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all tasks from API
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => tasksService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Combine project and task deadlines
  const allDeadlines: DeadlineItem[] = useMemo(() => {
    const projectDeadlines: DeadlineItem[] = projects
      .filter((p: any) => {
        const dateStr = p.expected_close_date || p.expectedCloseDate || p.end_date || p.endDate;
        return dateStr && isValid(parseISO(dateStr));
      })
      .map((p: any) => {
        const dateStr = p.expected_close_date || p.expectedCloseDate || p.end_date || p.endDate;
        return {
          id: p.id,
          name: p.name,
          dueDate: parseISO(dateStr),
          type: 'project' as const,
      sector: p.sector,
        };
      });

    const taskDeadlines: DeadlineItem[] = tasks
      .filter((t: any) => {
        const dateStr = t.due_date || t.dueDate;
        return dateStr && isValid(parseISO(dateStr)) && t.status !== 'completed';
      })
      .map((t: any) => {
        const dateStr = t.due_date || t.dueDate;
        const project = projects.find((p: any) => p.id === (t.project_id || t.projectId));
        return {
          id: t.id,
          name: t.title,
          dueDate: parseISO(dateStr),
          type: 'task' as const,
          projectId: t.project_id || t.projectId,
          projectName: project?.name || 'Unknown Project',
          priority: t.priority,
          status: t.status,
        };
      });

    return [...projectDeadlines, ...taskDeadlines];
  }, [projects, tasks]);

  // Get items due on selected date
  const itemsOnSelectedDate = selectedDate
    ? allDeadlines.filter((item) => isSameDay(item.dueDate, selectedDate))
    : [];

  // Get all dates that have deadlines
  const datesWithDeadlines = allDeadlines.map((item) => item.dueDate);

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'Manufacturing':
        return 'bg-chart-1/20 text-chart-1 border-chart-1/30';
      case 'Energy':
        return 'bg-chart-2/20 text-chart-2 border-chart-2/30';
      case 'Oil and Gas':
        return 'bg-chart-3/20 text-chart-3 border-chart-3/30';
      case 'Commodity Trading':
        return 'bg-chart-4/20 text-chart-4 border-chart-4/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'high':
        return 'bg-chart-4/20 text-chart-4 border-chart-4/30';
      case 'medium':
        return 'bg-chart-3/20 text-chart-3 border-chart-3/30';
      default:
        return 'bg-chart-5/20 text-chart-5 border-chart-5/30';
    }
  };

  if (isLoadingProjects || isLoadingTasks) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Calendar */}
    <Card className="border-border/50">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="truncate">Project & Task Deadlines</span>
        </CardTitle>
      </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 space-y-4 sm:space-y-6 pb-4 sm:pb-6">
        <div className="flex justify-center overflow-x-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
              className="rounded-md border border-border/50 shadow-sm"
            modifiers={{
                hasDeadline: datesWithDeadlines,
            }}
            modifiersStyles={{
                hasDeadline: {
                backgroundColor: 'hsl(var(--primary) / 0.15)',
                borderRadius: '50%',
                fontWeight: 'bold',
              },
            }}
          />
        </div>

        {selectedDate && (
            <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-border/50">
              <h4 className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                {format(selectedDate, 'MMM d, yyyy')}
            </h4>
              {itemsOnSelectedDate.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {itemsOnSelectedDate.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={item.type === 'project' ? `/projects/${item.id}` : `/projects/${item.projectId}`}
                      className="block p-3 sm:p-5 rounded-lg bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all shadow-sm"
                  >
                      <div className="flex items-start gap-2 sm:gap-4">
                        {item.type === 'project' ? (
                          <FolderKanban className="h-4 w-4 sm:h-6 sm:w-6 text-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckSquare className="h-4 w-4 sm:h-6 sm:w-6 text-primary mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-3">
                          <p className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">{item.name}</p>
                          {item.type === 'task' && item.projectName && (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-tight line-clamp-1">
                              Project: {item.projectName}
                            </p>
                          )}
                          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] sm:text-xs capitalize">
                              {item.type}
                            </Badge>
                            {item.sector && (
                              <Badge variant="outline" className={cn('text-[10px] sm:text-xs hidden sm:inline-flex', getSectorColor(item.sector))}>
                                {item.sector}
                              </Badge>
                            )}
                            {item.priority && (
                              <Badge variant="outline" className={cn('text-[10px] sm:text-xs capitalize', getPriorityColor(item.priority))}>
                                {item.priority}
                    </Badge>
                            )}
                          </div>
                        </div>
                  </div>
                    </Link>
                ))}
              </div>
            ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
                  No deadlines on this date
                </p>
            )}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card className="border-border/50">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-lg">Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {allDeadlines
              .filter((item) => item.dueDate >= new Date())
              .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
              .slice(0, 20)
              .map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.type === 'project' ? `/projects/${item.id}` : `/projects/${item.projectId}`}
                  className="block p-3 sm:p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent transition-all shadow-sm"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {item.type === 'project' ? (
                      <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] capitalize">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2">{item.name}</p>
                      {item.type === 'task' && item.projectName && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug line-clamp-1">
                          {item.projectName}
                        </p>
                      )}
                      <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-medium pt-1 sm:pt-1.5 border-t border-border/50">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {format(item.dueDate, 'MMM d, yyyy')}
                      </div>
                    </div>
                </div>
                </Link>
              ))}
            {allDeadlines.filter((item) => item.dueDate >= new Date()).length === 0 && (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8 col-span-full">
                No upcoming deadlines
              </p>
            )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
