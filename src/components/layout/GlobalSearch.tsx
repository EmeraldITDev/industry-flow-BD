import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckSquare, FolderKanban, Loader2, Search, X } from 'lucide-react';
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

function useShortcutLabel(): string {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl+K';
    const ua = navigator.userAgent || '';
    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform || navigator.platform || '';
    const isApple = /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/i.test(ua);
    return isApple ? '⌘ K' : 'Ctrl+K';
  }, []);
}

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const shortcutLabel = useShortcutLabel();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 150);

  const close = useCallback(() => setOpen(false), []);

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

  const {
    data: projectHits = [],
    isFetching: loadingProjects,
    isPending: pendingProjects,
  } = useQuery({
    queryKey: ['global-search', 'projects', debouncedQuery],
    queryFn: async () => {
      const { projects } = await projectsService.list({
        search: debouncedQuery,
        per_page: 6,
        lean: 1,
        quick: 1,
      });
      return projects;
    },
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const {
    data: taskHits = [],
    isFetching: loadingTasks,
    isPending: pendingTasks,
  } = useQuery({
    queryKey: ['global-search', 'tasks', debouncedQuery],
    queryFn: async () => {
      const { tasks } = await tasksService.list({
        search: debouncedQuery,
        per_page: 6,
      });
      return tasks;
    },
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const hasQuery = debouncedQuery.length >= 2;
  const isFetching = loadingProjects || loadingTasks;
  // Only block the list on the very first response for this query.
  const showBlockingSpinner =
    enabled && (pendingProjects || pendingTasks) && projectHits.length === 0 && taskHits.length === 0;
  const empty = hasQuery && !isFetching && projectHits.length === 0 && taskHits.length === 0;

  /** Navigate immediately on press — don't wait for dialog exit animation. */
  const go = useCallback(
    (path: string) => {
      startTransition(() => {
        navigate(path);
      });
      setOpen(false);
    },
    [navigate, startTransition]
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
        <kbd
          className={cn(
            'pointer-events-none ml-2 hidden shrink-0 md:inline-flex h-5 items-center',
            'rounded border border-border/80 bg-background px-1.5 shadow-sm',
            'font-sans text-[10px] font-semibold leading-none tracking-wide text-foreground'
          )}
        >
          {shortcutLabel}
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
        <DialogContent
          hideCloseButton
          className="overflow-hidden p-0 shadow-lg sm:max-w-xl gap-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const input = (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>(
              '[cmdk-input]'
            );
            input?.focus();
          }}
        >
          <DialogTitle className="sr-only">Search projects and tasks</DialogTitle>
          <Command
            shouldFilter={false}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-input]]:pr-10 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          >
            <div className="relative">
              <CommandInput
                placeholder="Search projects, clients, tasks, opportunity content..."
                value={query}
                onValueChange={setQuery}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  close();
                }}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CommandList>
              {!hasQuery && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search across projects and tasks.
                </div>
              )}
              {showBlockingSpinner && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              )}
              {empty && <CommandEmpty>No matches for “{debouncedQuery}”.</CommandEmpty>}

              {projectHits.length > 0 && (
                <CommandGroup heading="Projects">
                  {projectHits.map((project) => {
                    const path = `/projects/${project.id}`;
                    return (
                      <CommandItem
                        key={`p-${project.id}`}
                        value={`project-${project.id}`}
                        onSelect={() => go(path)}
                        onPointerDown={(e) => {
                          // Fire on press (not mouseup) so navigation isn't delayed by dialog teardown.
                          if (e.button !== 0) return;
                          e.preventDefault();
                          go(path);
                        }}
                        className="gap-2 cursor-pointer"
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
                    );
                  })}
                </CommandGroup>
              )}

              {projectHits.length > 0 && taskHits.length > 0 && <CommandSeparator />}

              {taskHits.length > 0 && (
                <CommandGroup heading="Tasks">
                  {taskHits.map((task) => {
                    const path = task.projectId
                      ? `/projects/${task.projectId}`
                      : `/tasks?search=${encodeURIComponent(task.title)}`;
                    return (
                      <CommandItem
                        key={`t-${task.id}`}
                        value={`task-${task.id}`}
                        onSelect={() => go(path)}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          go(path);
                        }}
                        className="gap-2 cursor-pointer"
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
                    );
                  })}
                </CommandGroup>
              )}

              {hasQuery && !showBlockingSpinner && (projectHits.length > 0 || taskHits.length > 0) && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Quick links">
                    <CommandItem
                      value="view-all-projects"
                      onSelect={() =>
                        go(`/projects?search=${encodeURIComponent(debouncedQuery)}`)
                      }
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        go(`/projects?search=${encodeURIComponent(debouncedQuery)}`);
                      }}
                      className="cursor-pointer"
                    >
                      View all matching projects
                      {isFetching && (
                        <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </CommandItem>
                    <CommandItem
                      value="view-all-tasks"
                      onSelect={() =>
                        go(`/tasks?search=${encodeURIComponent(debouncedQuery)}`)
                      }
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        go(`/tasks?search=${encodeURIComponent(debouncedQuery)}`);
                      }}
                      className="cursor-pointer"
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
