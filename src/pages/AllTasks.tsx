import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tasksService } from '@/services/tasks';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { useAuth } from '@/context/AuthContext';
import { Task, TaskStatus, TaskPriority, Project } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, RefreshCw, X, CheckSquare, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/dateUtils';

const statusConfig: Record<TaskStatus, { label: string; className: string; icon: React.ReactNode }> = {
  'todo': { label: 'To Do', className: 'bg-muted text-muted-foreground border-border', icon: <ListTodo className="w-3 h-3" /> },
  'in-progress': { label: 'In Progress', className: 'bg-chart-4/20 text-chart-4 border-chart-4/30', icon: <Clock className="w-3 h-3" /> },
  'review': { label: 'In Review', className: 'bg-chart-5/20 text-chart-5 border-chart-5/30', icon: <AlertCircle className="w-3 h-3" /> },
  'completed': { label: 'Completed', className: 'bg-chart-2/20 text-chart-2 border-chart-2/30', icon: <CheckSquare className="w-3 h-3" /> },
};

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  'low': { label: 'Low', className: 'bg-muted text-muted-foreground' },
  'medium': { label: 'Medium', className: 'bg-chart-4/20 text-chart-4' },
  'high': { label: 'High', className: 'bg-chart-5/20 text-chart-5' },
  'urgent': { label: 'Urgent', className: 'bg-destructive/20 text-destructive' },
};

export default function AllTasks() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const { data: allTasks = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => tasksService.getAll(),
    staleTime: 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Filter tasks based on access level
  const tasks = useMemo(() => {
    if (!user) return [];
    const accessLevel = user.accessLevel;
    // Admin and BD Director can see all tasks
    if (accessLevel === 'admin' || accessLevel === 'bd_director') {
      return allTasks;
    }
    // Project Manager and Employee: only tasks assigned to them or created/assigned by them
    const userId = String(user.id);
    return allTasks.filter(task => {
      const assigneeId = task.assigneeId ? String(task.assigneeId) : null;
      // Task is assigned to this user
      if (assigneeId === userId) return true;
      // Task assignee matches user name (fallback for string-based assignees)
      if (typeof task.assignee === 'string' && task.assignee === user.name) return true;
      return false;
    });
  }, [allTasks, user]);

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    projects.forEach(p => { map[p.id] = p; });
    return map;
  }, [projects]);

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {};
    teamMembers.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [teamMembers]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (search) {
        const s = search.toLowerCase();
        const projectName = projectMap[task.projectId]?.name || '';
        if (
          !task.title.toLowerCase().includes(s) &&
          !projectName.toLowerCase().includes(s) &&
          !(task.description || '').toLowerCase().includes(s)
        ) return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (projectFilter !== 'all' && task.projectId !== projectFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, projectFilter, projectMap]);

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }), [tasks]);

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setProjectFilter('all');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">All Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${filteredTasks.length} of ${tasks.length} tasks`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('todo')}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted"><ListTodo className="w-4 h-4 text-muted-foreground" /></div>
            <div><p className="text-2xl font-bold">{stats.todo}</p><p className="text-xs text-muted-foreground">To Do</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('in-progress')}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-chart-4/10"><Clock className="w-4 h-4 text-chart-4" /></div>
            <div><p className="text-2xl font-bold">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('review')}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-chart-5/10"><AlertCircle className="w-4 h-4 text-chart-5" /></div>
            <div><p className="text-2xl font-bold">{stats.review}</p><p className="text-xs text-muted-foreground">In Review</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('completed')}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-chart-2/10"><CheckSquare className="w-4 h-4 text-chart-2" /></div>
            <div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Tasks table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks found.</p>
          {hasFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map(task => {
                  const project = projectMap[task.projectId];
                  const sc = statusConfig[task.status] || statusConfig['todo'];
                  const pc = priorityConfig[task.priority] || priorityConfig['low'];
                  const assigneeName = task.assigneeId ? (teamMap[task.assigneeId] || (typeof task.assignee === 'string' ? task.assignee : 'Unassigned')) : 'Unassigned';

                  return (
                    <TableRow key={task.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project ? (
                          <Link to={`/projects/${project.id}`} className="text-sm text-primary hover:underline">
                            {project.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs gap-1", sc.className)}>
                          {sc.icon} {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", pc.className)}>
                          {pc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{assigneeName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {safeFormatDate(task.dueDate, 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
