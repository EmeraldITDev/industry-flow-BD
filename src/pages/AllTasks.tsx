import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { tasksService } from '@/services/tasks';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { useAuth } from '@/context/AuthContext';
import { TaskStatus, TaskPriority, Project } from '@/types';
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
import { Loader2, Search, RefreshCw, X, CheckSquare, Clock, AlertCircle, ListTodo, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/dateUtils';
import { generateTasksReport, TaskFilterSummary } from '@/lib/reportGenerator';
import { toast } from 'sonner';

const PER_PAGE = 50;

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
  const [searchParams] = useSearchParams();
  const chairmanOnly =
    searchParams.get('requiresChairmanIntervention') === '1' ||
    searchParams.get('assignedToChairman') === '1';
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    (searchParams.get('search') || '').trim()
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const isPrivileged =
    user?.accessLevel === 'admin' || user?.accessLevel === 'bd_director';

  const scopedAssigneeId = useMemo(() => {
    if (!user) return undefined;
    if (isPrivileged) {
      return assigneeFilter !== 'all' ? assigneeFilter : undefined;
    }
    // Non-admin / non-bd_director: best-effort scope to own tasks
    return String(user.id);
  }, [user, isPrivileged, assigneeFilter]);

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? (statusFilter as TaskStatus) : undefined,
      priority: priorityFilter !== 'all' ? (priorityFilter as TaskPriority) : undefined,
      projectId: projectFilter !== 'all' ? projectFilter : undefined,
      assigneeId: scopedAssigneeId,
      requiresChairmanIntervention: chairmanOnly ? true : undefined,
      per_page: PER_PAGE,
    }),
    [
      debouncedSearch,
      statusFilter,
      priorityFilter,
      projectFilter,
      scopedAssigneeId,
      chairmanOnly,
    ]
  );

  const {
    data: listPages,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['all-tasks', listFilters],
    queryFn: ({ pageParam = 1 }) =>
      tasksService.list({ ...listFilters, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.lastPage ? last.page + 1 : undefined,
    staleTime: 60 * 1000,
    enabled: !!user,
  });

  const tasks = useMemo(
    () => listPages?.pages.flatMap((p) => p.tasks) ?? [],
    [listPages]
  );
  const totalCount = listPages?.pages[0]?.total ?? tasks.length;

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  // Status card counts — independent of status filter, share other base flags
  const statusCountBase = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      priority: priorityFilter !== 'all' ? (priorityFilter as TaskPriority) : undefined,
      projectId: projectFilter !== 'all' ? projectFilter : undefined,
      assigneeId: scopedAssigneeId,
      requiresChairmanIntervention: chairmanOnly ? true : undefined,
      per_page: 1,
      page: 1,
    }),
    [debouncedSearch, priorityFilter, projectFilter, scopedAssigneeId, chairmanOnly]
  );

  const { data: todoCount } = useQuery({
    queryKey: ['all-tasks-count', 'todo', statusCountBase],
    queryFn: () =>
      tasksService.list({ ...statusCountBase, status: 'todo' }).then((r) => r.total),
    staleTime: 60 * 1000,
    enabled: !!user,
  });
  const { data: inProgressCount } = useQuery({
    queryKey: ['all-tasks-count', 'in-progress', statusCountBase],
    queryFn: () =>
      tasksService
        .list({ ...statusCountBase, status: 'in-progress' })
        .then((r) => r.total),
    staleTime: 60 * 1000,
    enabled: !!user,
  });
  const { data: reviewCount } = useQuery({
    queryKey: ['all-tasks-count', 'review', statusCountBase],
    queryFn: () =>
      tasksService.list({ ...statusCountBase, status: 'review' }).then((r) => r.total),
    staleTime: 60 * 1000,
    enabled: !!user,
  });
  const { data: completedCount } = useQuery({
    queryKey: ['all-tasks-count', 'completed', statusCountBase],
    queryFn: () =>
      tasksService
        .list({ ...statusCountBase, status: 'completed' })
        .then((r) => r.total),
    staleTime: 60 * 1000,
    enabled: !!user,
  });

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    projects.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [projects]);

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {};
    teamMembers.forEach((m) => {
      map[m.id] = m.name;
    });
    return map;
  }, [teamMembers]);

  const hasFilters =
    search ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    projectFilter !== 'all' ||
    assigneeFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setProjectFilter('all');
    setAssigneeFilter('all');
  };

  const assigneeOptions = useMemo(
    () =>
      [...teamMembers]
        .map((m) => ({ id: String(m.id), name: String(m.name || m.email || m.id) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [teamMembers]
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            {chairmanOnly ? 'Chairman Attention Tasks' : 'All Tasks'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoading
              ? 'Loading...'
              : chairmanOnly
                ? `${totalCount} open tasks requiring chairman intervention`
                : `${totalCount} tasks found`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const filterSummary: TaskFilterSummary = {
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                priority: priorityFilter !== 'all' ? priorityFilter : undefined,
                project:
                  projectFilter !== 'all'
                    ? projectMap[projectFilter]?.name || projectFilter
                    : undefined,
                assignee:
                  assigneeFilter !== 'all'
                    ? teamMap[assigneeFilter] || assigneeFilter
                    : undefined,
              };
              const pMap: Record<string, { name: string }> = {};
              projects.forEach((p) => {
                pMap[p.id] = { name: p.name };
              });
              generateTasksReport(tasks, filterSummary, pMap, teamMap);
              toast.success('PDF report generated');
            }}
            disabled={tasks.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setStatusFilter('todo')}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted">
              <ListTodo className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todoCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">To Do</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setStatusFilter('in-progress')}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-chart-4/10">
              <Clock className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setStatusFilter('review')}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-chart-5/10">
              <AlertCircle className="w-4 h-4 text-chart-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reviewCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">In Review</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setStatusFilter('completed')}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-chart-2/10">
              <CheckSquare className="w-4 h-4 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
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
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPrivileged && (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {assigneeOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks found.</p>
          {hasFilters && (
            <Button variant="link" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
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
                {tasks.map((task) => {
                  const project = projectMap[task.projectId];
                  const sc = statusConfig[task.status] || statusConfig['todo'];
                  const pc = priorityConfig[task.priority] || priorityConfig['low'];
                  const assigneeIds = [
                    ...(task.assigneeIds ?? []),
                    ...(task.assigneeId ? [String(task.assigneeId)] : []),
                  ].filter((id, i, arr) => id && arr.indexOf(id) === i);
                  const assigneeName =
                    assigneeIds.length > 0
                      ? assigneeIds.map((id) => teamMap[id]).filter(Boolean).join(', ') ||
                        (typeof task.assignee === 'string' ? task.assignee : 'Assigned')
                      : 'Unassigned';

                  return (
                    <TableRow key={task.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project ? (
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {project.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs gap-1', sc.className)}>
                          {sc.icon} {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', pc.className)}>
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
          <div ref={loadMoreRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more…
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
