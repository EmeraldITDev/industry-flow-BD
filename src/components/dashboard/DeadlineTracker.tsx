import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Project } from '@/types';
import { differenceInDays, format } from 'date-fns';

interface DeadlineTrackerProps {
  projects: Project[];
}

export function DeadlineTracker({ projects }: DeadlineTrackerProps) {
  const deadlineItems = useMemo(() => {
    const now = new Date();
    return projects
      .filter((p) => p.status === 'active' && p.endDate)
      .map((p) => {
        const end = new Date(p.endDate!);
        const daysLeft = differenceInDays(end, now);
        return { ...p, daysLeft, endDate: end };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [projects]);

  if (deadlineItems.length === 0) return null;

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-2">
        {deadlineItems.map((item) => {
          const isOverdue = item.daysLeft < 0;
          const isUrgent = item.daysLeft >= 0 && item.daysLeft <= 7;
          return (
            <Link
              key={item.id}
              to={`/projects/${item.id}`}
              className="flex items-center justify-between p-2 sm:p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isOverdue ? (
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                ) : isUrgent ? (
                  <Clock className="w-4 h-4 text-chart-5 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-chart-2 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-medium truncate">{item.name}</span>
              </div>
              <Badge
                variant={isOverdue ? 'destructive' : 'outline'}
                className={`text-[10px] sm:text-xs shrink-0 ml-2 ${isUrgent && !isOverdue ? 'border-chart-5 text-chart-5' : ''}`}
              >
                {isOverdue
                  ? `${Math.abs(item.daysLeft)}d overdue`
                  : item.daysLeft === 0
                    ? 'Due today'
                    : `${item.daysLeft}d left`}
              </Badge>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
