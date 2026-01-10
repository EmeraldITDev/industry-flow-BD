import { useState } from 'react';
import { Task, TaskStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Calendar, Circle, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
}

const columns: { status: TaskStatus; title: string; icon: React.ElementType; color: string }[] = [
  { status: 'todo', title: 'To Do', icon: Circle, color: 'border-t-muted' },
  { status: 'in-progress', title: 'In Progress', icon: Clock, color: 'border-t-chart-3' },
  { status: 'review', title: 'In Review', icon: AlertCircle, color: 'border-t-chart-4' },
  { status: 'completed', title: 'Completed', icon: CheckCircle2, color: 'border-t-chart-1' },
];

export function KanbanBoard({ tasks: initialTasks, onTaskMove }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const priorityColors = {
    low: 'bg-chart-5/20 text-chart-5',
    medium: 'bg-chart-3/20 text-chart-3',
    high: 'bg-chart-4/20 text-chart-4',
    urgent: 'bg-destructive/20 text-destructive',
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(t => t.status === status);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    
    // Update local state
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === draggableId 
          ? { ...task, status: newStatus }
          : task
      )
    );

    // Notify parent component
    onTaskMove?.(draggableId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.status);
          return (
            <div key={column.status} className={cn("bg-card rounded-lg border border-border border-t-4", column.color)}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <column.icon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium">{column.title}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-muted">
                    {columnTasks.length}
                  </Badge>
                </div>
              </div>
              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "p-3 space-y-3 min-h-[200px] max-h-[500px] overflow-auto transition-colors",
                      snapshot.isDraggingOver && "bg-accent/50"
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "p-3 bg-background rounded-md border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing",
                              snapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
                                {task.priority}
                              </Badge>
                              {task.assignee && (
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {getInitials(task.assignee)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                            {task.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                                {task.notes}
                              </p>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                        No tasks
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
