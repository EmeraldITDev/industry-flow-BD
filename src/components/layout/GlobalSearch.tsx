import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, FolderKanban, Loader2, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { projectsService } from '@/services/projects';
import { tasksService } from '@/services/tasks';
import { PIPELINE_STAGES } from '@/types';
import { cn } from '@/lib/utils';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function stageLabel(stage?: string): string {
  if (!stage) return '';
  return PIPELINE_STAGES.find((s) => s.value === stage)?.label || stage;
}

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 280);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const enabled = open && debouncedQuery.length >= 2;

  const { data: projectHits = [], isFetching: loadingProjects } = useQuery({
    queryKey: ['global-search', 'projects', debouncedQuery],
    queryFn: async () => {
      const { projects } = await projectsService.list({
        search: debouncedQuery,
        per_page: 8,
        lean: 1,
      });
      return projects;
    },
    enabled,
    staleTime: 30_000,
  });

  const { data: taskHits = [], isFetching: loadingTasks } = useQuery({
    queryKey: ['global-search', 'tasks', debouncedQuery],
    queryFn: async () => {
      const { tasks } = await tasksService.list({
        search: debouncedQuery,
        per_page: 8,
      });
      return tasks;
    },
    enabled,
    staleTime: 30_000,
  });

  const isLoading = enabled && (loadingProjects || loadingTasks);
  const hasQuery = debouncedQuery.length >= 2;
  const empty = hasQuery && !isLoading && projectHits.length === 0 && taskHits.length === 0;

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative hidden sm:flex h-9 w-40 md:w-56 lg:w-80 max-w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent/40 transition-colors',
          className
        )}
        aria-label="Search projects and tasks"
      >
        <Search className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate flex-1 text-left">Search projects, tasks...</span>
        <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:hidden h-8 w-8"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg sm:max-w-xl">
          <DialogTitle className="sr-only">Search projects and tasks</DialogTitle>
          {/* Server-side search — disable cmdk client filtering */}
          <Command
            shouldFilter={false}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          >
            <CommandInput
              placeholder="Search projects, clients, tasks, opportunity content..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {!hasQuery && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search across projects and tasks.
                </div>
              )}
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              )}
              {empty && <CommandEmpty>No matches for “{debouncedQuery}”.</CommandEmpty>}

              {projectHits.length > 0 && (
                <CommandGroup heading="Projects">
                  {projectHits.map((project) => (
                    <CommandItem
                      key={`p-${project.id}`}
                      value={`project-${project.id}`}
                      onSelect={() => go(`/projects/${project.id}`)}
                      className="gap-2"
                    >
                      <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{project.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[project.clientName, stageLabel(project.pipelineStage), project.location]
                            .filter(Boolean)
                            .join(' · ') || 'Opportunity'}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {projectHits.length > 0 && taskHits.length > 0 && <CommandSeparator />}

              {taskHits.length > 0 && (
                <CommandGroup heading="Tasks">
                  {taskHits.map((task) => (
                    <CommandItem
                      key={`t-${task.id}`}
                      value={`task-${task.id}`}
                      onSelect={() =>
                        go(
                          task.projectId
                            ? `/projects/${task.projectId}`
                            : `/tasks?search=${encodeURIComponent(task.title)}`
                        )
                      }
                      className="gap-2"
                    >
                      <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{task.title}</p>
                        <p className="truncate text-xs text-muted-foreground capitalize">
                          {[task.status?.replace(/_/g, ' '), task.priority]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {hasQuery && !isLoading && (projectHits.length > 0 || taskHits.length > 0) && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Quick links">
                    <CommandItem
                      value="view-all-projects"
                      onSelect={() =>
                        go(`/projects?search=${encodeURIComponent(debouncedQuery)}`)
                      }
                    >
                      View all matching projects
                    </CommandItem>
                    <CommandItem
                      value="view-all-tasks"
                      onSelect={() =>
                        go(`/tasks?search=${encodeURIComponent(debouncedQuery)}`)
                      }
                    >
                      View all matching tasks
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
