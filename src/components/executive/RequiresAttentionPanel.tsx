import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { safeFormatDate } from '@/lib/dateUtils';

export interface ChairmanAttentionTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string | null;
  projectId?: string;
  projectName?: string;
  client?: string;
  businessVertical?: string;
  assignee?: string;
  requiresChairmanIntervention?: boolean;
  assignedToChairman?: boolean;
}

export function RequiresAttentionPanel({
  data,
}: {
  data: ExecutiveIntelligence & { requiresAttention?: ChairmanAttentionTask[] };
}) {
  const navigate = useNavigate();
  const tasks = data.requiresAttention ?? [];
  const count = data.totals.requiresAttention ?? tasks.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Requires Executive Attention</CardTitle>
            <p className="text-xs text-muted-foreground">
              Open tasks flagged for chairman intervention, ordered by due date.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tasks?requiresChairmanIntervention=1')}
          >
            View all {count}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No open tasks require chairman intervention.
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.slice(0, 8).map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border px-3 py-2 text-left hover:border-primary/60"
                  onClick={() =>
                    navigate(
                      task.projectId
                        ? `/projects/${task.projectId}`
                        : '/tasks?requiresChairmanIntervention=1'
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.projectName || 'Untitled project'}
                        {task.client ? ` · ${task.client}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <Badge variant="outline" className="text-[10px]">
                        {task.priority || '—'}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground">
                        Due {safeFormatDate(task.dueDate, 'MMM d', '—')}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
