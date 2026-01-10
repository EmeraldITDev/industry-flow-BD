import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { CheckCircle2, Circle, Clock, AlertCircle, User, ArrowRightLeft, ClipboardList } from 'lucide-react';
import { Task, Project, TeamMember } from '@/types';
import { toast } from 'sonner';

export function TasksSummary() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newAssignee, setNewAssignee] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const allTasks = useMemo(() => {
    return (projects || []).flatMap((p: Project) => p.tasks || []);
  }, [projects]);

  const tasksByStatus = useMemo(() => ({
    todo: allTasks.filter((t: Task) => t.status === 'todo'),
    'in-progress': allTasks.filter((t: Task) => t.status === 'in-progress'),
    review: allTasks.filter((t: Task) => t.status === 'review'),
    completed: allTasks.filter((t: Task) => t.status === 'completed'),
  }), [allTasks]);

  const tasksByMember = useMemo(() => {
    return (teamMembers || []).map((member: TeamMember) => ({
      member,
      tasks: allTasks.filter((t: Task) => t.assignee === member.name),
      todo: allTasks.filter((t: Task) => t.assignee === member.name && t.status === 'todo').length,
      inProgress: allTasks.filter((t: Task) => t.assignee === member.name && t.status === 'in-progress').length,
      review: allTasks.filter((t: Task) => t.assignee === member.name && t.status === 'review').length,
      completed: allTasks.filter((t: Task) => t.assignee === member.name && t.status === 'completed').length,
    }));
  }, [allTasks, teamMembers]);

  const statusConfig = [
    { key: 'todo', label: 'To Do', icon: Circle, color: 'text-chart-5' },
    { key: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-chart-3' },
    { key: 'review', label: 'In Review', icon: AlertCircle, color: 'text-chart-4' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-chart-1' },
  ];

  const handleTransferTask = () => {
    if (!selectedTask || !newAssignee) return;
    // TODO: Call API to transfer task
    toast.success(`Task transferred to ${newAssignee}`);
    setDialogOpen(false);
    setSelectedTask(null);
    setNewAssignee('');
  };

  const isLoading = projectsLoading || teamLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Tasks Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Tasks Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4 h-8 sm:h-10">
            <TabsTrigger value="status" className="text-xs sm:text-sm">By Status</TabsTrigger>
            <TabsTrigger value="member" className="text-xs sm:text-sm">By Member</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status">
            {allTasks.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No tasks yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {statusConfig.map(status => (
                  <div 
                    key={status.key} 
                    className="p-2.5 sm:p-4 rounded-lg bg-accent/30 border border-border"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <status.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${status.color}`} />
                      <span className="text-[10px] sm:text-sm font-medium text-muted-foreground">{status.label}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">
                      {tasksByStatus[status.key as keyof typeof tasksByStatus].length}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="member">
            {tasksByMember.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No team members yet</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {tasksByMember.map(({ member, tasks, todo, inProgress, review, completed }) => (
                  <div 
                    key={member.id} 
                    className="p-2.5 sm:p-4 rounded-lg bg-accent/30 border border-border"
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm sm:text-base font-medium">{member.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{member.department}</p>
                        </div>
                      </div>
                      <span className="text-sm sm:text-lg font-bold">{tasks.length}</span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1 sm:gap-2 text-[10px] sm:text-xs mb-2 sm:mb-3">
                      <div className="text-center p-1 rounded bg-chart-5/10">
                        <p className="text-chart-5 font-medium">{todo}</p>
                        <p className="text-muted-foreground">To Do</p>
                      </div>
                      <div className="text-center p-1 rounded bg-chart-3/10">
                        <p className="text-chart-3 font-medium">{inProgress}</p>
                        <p className="text-muted-foreground">In Progress</p>
                      </div>
                      <div className="text-center p-1 rounded bg-chart-4/10">
                        <p className="text-chart-4 font-medium">{review}</p>
                        <p className="text-muted-foreground">Review</p>
                      </div>
                      <div className="text-center p-1 rounded bg-chart-1/10">
                        <p className="text-chart-1 font-medium">{completed}</p>
                        <p className="text-muted-foreground">Done</p>
                      </div>
                    </div>
                    
                    {tasks.length > 0 && (
                      <Dialog open={dialogOpen && selectedTask?.assignee === member.name} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setSelectedTask(tasks[0])}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Transfer Tasks
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Transfer Task</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Select Task</label>
                              <Select 
                                value={selectedTask?.id || ''} 
                                onValueChange={(id) => setSelectedTask(tasks.find((t: Task) => t.id === id) || null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a task" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tasks.map((task: Task) => (
                                    <SelectItem key={task.id} value={task.id}>
                                      {task.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Transfer to</label>
                              <Select value={newAssignee} onValueChange={setNewAssignee}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(teamMembers || [])
                                    .filter((m: TeamMember) => m.name !== member.name)
                                    .map((m: TeamMember) => (
                                      <SelectItem key={m.id} value={m.name}>
                                        {m.name} ({m.department})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <Button 
                              onClick={handleTransferTask} 
                              disabled={!selectedTask || !newAssignee}
                              className="w-full"
                            >
                              Transfer Task
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
