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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Calendar - Takes 2 columns on large screens */}
      <Card className="border-border/50 xl:col-span-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Project & Task Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border border-border/50"
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
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {format(selectedDate, 'MMMM d, yyyy')}
              </h4>
              {itemsOnSelectedDate.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {itemsOnSelectedDate.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={item.type === 'project' ? `/projects/${item.id}` : `/projects/${item.projectId}`}
                      className="block p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        {item.type === 'project' ? (
                          <FolderKanban className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.type === 'task' && item.projectName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.projectName}
                            </p>
                          )}
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                            {item.sector && (
                              <Badge variant="outline" className={cn('text-xs', getSectorColor(item.sector))}>
                                {item.sector}
                              </Badge>
                            )}
                            {item.priority && (
                              <Badge variant="outline" className={cn('text-xs', getPriorityColor(item.priority))}>
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
                <p className="text-sm text-muted-foreground">No deadlines on this date</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines Sidebar */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto px-6 py-4">
            {allDeadlines
              .filter((item) => item.dueDate >= new Date())
              .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
              .slice(0, 20)
              .map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.type === 'project' ? `/projects/${item.id}` : `/projects/${item.projectId}`}
                  className="block p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {item.type === 'project' ? (
                      <FolderKanban className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckSquare className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.type === 'task' && item.projectName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.projectName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(item.dueDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            {allDeadlines.filter((item) => item.dueDate >= new Date()).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming deadlines
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
