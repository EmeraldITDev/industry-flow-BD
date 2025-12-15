import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projects, teamMembers } from '@/data/mockData';
import { CheckCircle2, Circle, Clock, AlertCircle, User, ArrowRightLeft } from 'lucide-react';
import { Task } from '@/types';
import { toast } from 'sonner';

export function TasksSummary() {
  const [allTasks, setAllTasks] = useState<Task[]>(projects.flatMap(p => p.tasks));
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newAssignee, setNewAssignee] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const tasksByStatus = {
    todo: allTasks.filter(t => t.status === 'todo'),
    'in-progress': allTasks.filter(t => t.status === 'in-progress'),
    review: allTasks.filter(t => t.status === 'review'),
    completed: allTasks.filter(t => t.status === 'completed'),
  };

  const tasksByMember = teamMembers.map(member => ({
    member,
    tasks: allTasks.filter(t => t.assignee === member.name),
    todo: allTasks.filter(t => t.assignee === member.name && t.status === 'todo').length,
    inProgress: allTasks.filter(t => t.assignee === member.name && t.status === 'in-progress').length,
    review: allTasks.filter(t => t.assignee === member.name && t.status === 'review').length,
    completed: allTasks.filter(t => t.assignee === member.name && t.status === 'completed').length,
  }));

  const statusConfig = [
    { key: 'todo', label: 'To Do', icon: Circle, color: 'text-chart-5' },
    { key: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-chart-3' },
    { key: 'review', label: 'In Review', icon: AlertCircle, color: 'text-chart-4' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-chart-1' },
  ];

  const handleTransferTask = () => {
    if (!selectedTask || !newAssignee) return;
    
    setAllTasks(prev => prev.map(t => 
      t.id === selectedTask.id ? { ...t, assignee: newAssignee } : t
    ));
    
    toast.success(`Task transferred to ${newAssignee}`);
    setDialogOpen(false);
    setSelectedTask(null);
    setNewAssignee('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="status">By Status</TabsTrigger>
            <TabsTrigger value="member">By Team Member</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status">
            <div className="grid grid-cols-2 gap-4">
              {statusConfig.map(status => (
                <div 
                  key={status.key} 
                  className="p-4 rounded-lg bg-accent/30 border border-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <status.icon className={`w-5 h-5 ${status.color}`} />
                    <span className="text-sm font-medium text-muted-foreground">{status.label}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {tasksByStatus[status.key as keyof typeof tasksByStatus].length}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="member">
            <div className="space-y-3">
              {tasksByMember.map(({ member, tasks, todo, inProgress, review, completed }) => (
                <div 
                  key={member.id} 
                  className="p-4 rounded-lg bg-accent/30 border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.department}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold">{tasks.length} tasks</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs mb-3">
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
                              onValueChange={(id) => setSelectedTask(tasks.find(t => t.id === id) || null)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a task" />
                              </SelectTrigger>
                              <SelectContent>
                                {tasks.map(task => (
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
                                {teamMembers
                                  .filter(m => m.name !== member.name)
                                  .map(m => (
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
