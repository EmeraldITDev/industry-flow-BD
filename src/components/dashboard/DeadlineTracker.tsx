
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Task } from '@/types';
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns';

interface DeadlineTrackerProps {
  tasks: Task[];
  isLoading?: boolean;
}

export function DeadlineTracker({
  tasks,
  isLoading = false,
}: DeadlineTrackerProps) {
  const deadlineItems = useMemo(() => {
    const today = new Date();

    return tasks
      .filter((task) =>
        Boolean(task.dueDate) &&
        !['completed', 'cancelled'].includes(task.status)
      )
      .map((task) => {
        const dueDate = parseISO(String(task.dueDate));
        return {
          ...task,
          daysLeft: differenceInCalendarDays(dueDate, today),
          validDate: isValid(dueDate),
        };
      })
      .filter((task) => task.validDate)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Upcoming Task Deadlines
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading task deadlines...</p>
        ) : deadlineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outstanding tasks with due dates.
          </p>
        ) : (
          deadlineItems.map((task) => {
            const isOverdue = task.daysLeft < 0;
            const isUrgent = task.daysLeft >= 0 && task.daysLeft <= 7;

            const destination = task.projectId
              ? `/projects/${task.projectId}?taskId=${task.id}`
              : task.partnerId
                ? `/partners/${task.partnerId}?taskId=${task.id}`
                : `/tasks?taskId=${task.id}`;

            return (
              <Link
                key={task.id}
                to={destination}
                className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  ) : isUrgent ? (
                    <Clock className="w-4 h-4 text-chart-5 shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-chart-2 shrink-0" />
                  )}

                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {task.partnerId ? 'Partner task' : 'Project task'}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={isOverdue ? 'destructive' : 'outline'}
                  className={`text-[10px] sm:text-xs shrink-0 ${
                    isUrgent && !isOverdue ? 'border-chart-5 text-chart-5' : ''
                  }`}
                >
                  {isOverdue
                    ? `${Math.abs(task.daysLeft)}d overdue`
                    : task.daysLeft === 0
                      ? 'Due today'
                      : `${task.daysLeft}d left`}
                </Badge>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
