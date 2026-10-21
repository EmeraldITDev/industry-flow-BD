import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckSquare,
  Clock,
  ListTodo,
  Loader2,
} from 'lucide-react';
import type { Partner } from '@/types/partners';
import { tasksService } from '@/services/tasks';
import { getPartnerMissingFields } from '@/lib/partnerCompleteness';
import { safeFormatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

type Props = {
  partner: Partner;
  onOpenTasks?: () => void;
  onEditProfile?: () => void;
  className?: string;
};

export function PartnerMiniDashboard({
  partner,
  onOpenTasks,
  onEditProfile,
  className,
}: Props) {
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['partner-tasks', partner.id],
    queryFn: () => tasksService.getByPartner(partner.id),
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const open = todo + inProgress + review;
    return { todo, inProgress, review, completed, open, total: tasks.length };
  }, [tasks]);

  const missing = useMemo(() => getPartnerMissingFields(partner), [partner]);

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => {
          const aT = Date.parse(a.createdAt || '') || 0;
          const bT = Date.parse(b.createdAt || '') || 0;
          return bT - aT;
        })
        .slice(0, 4),
    [tasks],
  );

  return (
    <div className={cn('grid gap-3 md:grid-cols-3', className)}>
      <Card>
        <CardHeader className="p-4 pb-2 space-y-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Tasks
          </CardTitle>
          {tasksLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {counts.open}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">
                  open
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {counts.total} total · {counts.completed} completed
              </p>
            </>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="text-sm font-semibold tabular-nums">{counts.todo}</p>
              <p className="text-[10px] text-muted-foreground">To do</p>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="text-sm font-semibold tabular-nums">
                {counts.inProgress}
              </p>
              <p className="text-[10px] text-muted-foreground">In progress</p>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="text-sm font-semibold tabular-nums">{counts.review}</p>
              <p className="text-[10px] text-muted-foreground">Review</p>
            </div>
          </div>
          {onOpenTasks && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8"
              onClick={onOpenTasks}
            >
              <ListTodo className="h-3.5 w-3.5 mr-1.5" />
              View tasks
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2 space-y-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Missing info
          </CardTitle>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {missing.length}
            <span className="text-sm font-normal text-muted-foreground ml-1.5">
              field{missing.length === 1 ? '' : 's'}
            </span>
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          {missing.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Profile looks complete.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {missing.map((field) => (
                <Badge
                  key={field.key}
                  variant="outline"
                  className="text-xs font-normal border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                >
                  {field.label}
                </Badge>
              ))}
            </ul>
          )}
          {onEditProfile && missing.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8"
              onClick={onEditProfile}
            >
              Complete profile
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2 space-y-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-chart-4" />
            Recent updates
          </CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Profile updated{' '}
            {safeFormatDate(partner.updatedAt || partner.createdAt, 'MMM d, yyyy')}
            {partner.lastContactDate
              ? ` · Last contact ${safeFormatDate(partner.lastContactDate, 'MMM d')}`
              : ''}
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-1.5">
          {tasksLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : recentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              No recent task activity.
            </p>
          ) : (
            recentTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="w-full flex items-start justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-accent/60 transition-colors"
                onClick={onOpenTasks}
              >
                <span className="min-w-0 truncate font-medium">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground capitalize">
                  {task.status.replace('-', ' ')}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
