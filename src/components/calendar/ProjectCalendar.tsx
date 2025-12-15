import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { projects } from '@/data/mockData';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock } from 'lucide-react';

interface ProjectDueDate {
  projectId: string;
  projectName: string;
  dueDate: Date;
  sector: string;
}

export function ProjectCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Collect all project due dates
  const projectDueDates: ProjectDueDate[] = projects
    .filter((p) => p.expectedCloseDate || p.endDate)
    .map((p) => ({
      projectId: p.id,
      projectName: p.name,
      dueDate: parseISO(p.expectedCloseDate || p.endDate || ''),
      sector: p.sector,
    }));

  // Get projects due on selected date
  const projectsOnSelectedDate = selectedDate
    ? projectDueDates.filter((p) => isSameDay(p.dueDate, selectedDate))
    : [];

  // Get all dates that have project due dates
  const datesWithProjects = projectDueDates.map((p) => p.dueDate);

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'Manufacturing':
        return 'bg-chart-1/20 text-chart-1 border-chart-1/30';
      case 'Energy':
        return 'bg-chart-2/20 text-chart-2 border-chart-2/30';
      case 'Oil and Gas':
        return 'bg-chart-3/20 text-chart-3 border-chart-3/30';
      case 'Logistics':
        return 'bg-chart-4/20 text-chart-4 border-chart-4/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" />
          Project Due Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border border-border/50 pointer-events-auto"
          modifiers={{
            hasProject: datesWithProjects,
          }}
          modifiersStyles={{
            hasProject: {
              backgroundColor: 'hsl(var(--primary) / 0.15)',
              borderRadius: '50%',
              fontWeight: 'bold',
            },
          }}
        />

        {selectedDate && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {format(selectedDate, 'MMMM d, yyyy')}
            </h4>
            {projectsOnSelectedDate.length > 0 ? (
              <div className="space-y-2">
                {projectsOnSelectedDate.map((project) => (
                  <div
                    key={project.projectId}
                    className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-sm">{project.projectName}</p>
                    <Badge
                      variant="outline"
                      className={cn('mt-1 text-xs', getSectorColor(project.sector))}
                    >
                      {project.sector}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/70">No projects due on this date</p>
            )}
          </div>
        )}

        {/* Upcoming due dates summary */}
        <div className="pt-3 border-t border-border/50">
          <h4 className="text-sm font-medium mb-2">Upcoming Due Dates</h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {projectDueDates
              .filter((p) => p.dueDate >= new Date())
              .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
              .slice(0, 5)
              .map((project) => (
                <div
                  key={project.projectId}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span className="truncate flex-1 mr-2">{project.projectName}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {format(project.dueDate, 'MMM d')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
