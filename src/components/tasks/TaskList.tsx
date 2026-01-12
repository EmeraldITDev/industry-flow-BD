import { useState } from 'react';
import { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, AlertCircle, StickyNote, Check, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { safeFormatDate, isOverdue as checkOverdue } from '@/lib/dateUtils';

interface TaskListProps {
  tasks: Task[];
  title?: string;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function TaskList({ tasks, title, onTaskUpdate, onTaskDelete }: TaskListProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const priorityColors = {
    low: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    medium: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
    high: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
    urgent: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  const statusColors = {
    todo: 'bg-muted text-muted-foreground',
    'in-progress': 'bg-chart-3/20 text-chart-3',
    review: 'bg-chart-4/20 text-chart-4',
    completed: 'bg-chart-1/20 text-chart-1',
  };

  // Handle assignee being either a string name or an object { id, name }
  const getAssigneeName = (assignee: any): string | null => {
    if (!assignee) return null;
    if (typeof assignee === 'string') return assignee;
    if (typeof assignee === 'object' && assignee.name) return assignee.name;
    return null;
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    if (typeof name !== 'string') return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const isOverdue = (dueDate?: string | null) => checkOverdue(dueDate);

  const handleEditNote = (task: Task) => {
    setEditingNoteId(task.id);
    setNoteValue(task.notes || '');
  };

  const handleSaveNote = (taskId: string) => {
    onTaskUpdate?.(taskId, { notes: noteValue });
    setEditingNoteId(null);
    setNoteValue('');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setNoteValue('');
  };

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <span className="text-sm font-normal text-muted-foreground">
              {tasks.length} tasks
            </span>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!title && "pt-6")}>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks found</p>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                className="group p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className={statusColors[task.status]}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                      {task.dueDate && isOverdue(task.dueDate) && task.status !== 'completed' && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getAssigneeName(task.assignee) && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(getAssigneeName(task.assignee))}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {onTaskDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onTaskDelete(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Notes Section */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Notes</span>
                  </div>
                  {editingNoteId === task.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        placeholder="Add notes for this task..."
                        className="min-h-[80px] text-sm"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleSaveNote(task.id)}>
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => handleEditNote(task)}
                      className="cursor-pointer p-2 rounded bg-muted/50 hover:bg-muted transition-colors min-h-[40px]"
                    >
                      {task.notes ? (
                        <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Click to add notes...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  {getAssigneeName(task.assignee) && <span>{getAssigneeName(task.assignee)}</span>}
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{safeFormatDate(task.dueDate, 'MMM d, yyyy', '-')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
