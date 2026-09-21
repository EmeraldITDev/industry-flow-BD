import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MultiSearchableSelect } from '@/components/ui/multi-searchable-select';
import { tasksService, CreateTaskData } from '@/services/tasks';
import { teamService } from '@/services/team';
import { TaskPriority, TaskStatus } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { canSetChairmanIntervention } from '@/lib/permissions/chairmanIntervention';
import { TaskAttachmentsField } from '@/components/tasks/TaskAttachmentsField';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTaskCreated?: () => void;
}

export function AddTaskDialog({ open, onOpenChange, projectId, onTaskCreated }: AddTaskDialogProps) {
  const { user } = useAuth();
  const canFlagChairman = canSetChairmanIntervention(user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'todo' as TaskStatus,
    assigneeIds: [] as string[],
    requiresChairmanIntervention: false,
    dueDate: undefined as Date | undefined,
    notes: '',
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Fetch team members from backend
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const assigneeOptions = teamMembers.map((member: any) => ({
    value: String(member.id),
    label: member.name || member.email || String(member.id),
  }));

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assigneeIds: [],
      requiresChairmanIntervention: false,
      dueDate: undefined,
      notes: '',
    });
    setPendingFiles([]);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData: CreateTaskData = {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
        assigneeIds: formData.assigneeIds,
        assigneeId: formData.assigneeIds[0],
        requiresChairmanIntervention: canFlagChairman
          ? formData.requiresChairmanIntervention
          : false,
        dueDate: formData.dueDate?.toISOString(),
        projectId: projectId,
        notes: formData.notes || undefined,
      };

      const created = await tasksService.create(taskData);
      if (pendingFiles.length > 0) {
        await tasksService.uploadAttachments(created.id, pendingFiles);
      }
      toast.success('Task created successfully');
      onOpenChange(false);
      onTaskCreated?.();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: TaskStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            <MultiSearchableSelect
              values={formData.assigneeIds}
              onValuesChange={(assigneeIds) =>
                setFormData({ ...formData, assigneeIds })
              }
              options={assigneeOptions}
              placeholder="Select assignees"
              searchPlaceholder="Search team..."
              emptyText="No team members found."
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {canFlagChairman && (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                id="requires-chairman"
                checked={formData.requiresChairmanIntervention}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    requiresChairmanIntervention: checked === true,
                  })
                }
              />
              <Label htmlFor="requires-chairman" className="text-sm font-normal cursor-pointer">
                Requires chairman intervention
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <TaskAttachmentsField
            pendingFiles={pendingFiles}
            onPendingChange={setPendingFiles}
            disabled={isSubmitting}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
