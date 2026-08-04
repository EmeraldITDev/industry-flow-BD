import { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { AdvancedFilters, FilterState, defaultFilters } from '@/components/projects/AdvancedFilters';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { tasksService } from '@/services/tasks';
import { Button } from '@/components/ui/button';
import { Plus, Grid3X3, List, Loader2, Upload, Trash2, X, RefreshCw, FileText } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Project, Sector } from '@/types';
import { ProjectImportDialog } from '@/components/projects/ProjectImportDialog';
import { ExportProjectsButton } from '@/components/projects/ExportProjectsButton';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { generateProjectsReport, ProjectFilterSummary } from '@/lib/reportGenerator';

// Mapping for sector display names
const sectorDisplayNames: Record<string, string> = {
  'EMR_OGP': 'EMR_OGP Projects',
  'EMR_MFG': 'EMR_MFG Projects',
  'EMR_Services': 'EMR_Services Projects',
  'BEDS_Services': 'BEDS_Services Projects',
  'EMR_Healthcare': 'EMR_Healthcare Projects',
  'EMR_Renewables': 'EMR_Renewables Projects',
  'EMR_Trading': 'EMR_Trading Projects',
};

// Array filter keys that map to URL params (comma-separated)
const ARRAY_FILTER_KEYS: (keyof FilterState)[] = [
  'sectors', 'statuses', 'pipelineStages', 'businessSegments',
  'projectLeads', 'assignees', 'clientNames', 'oems',
  'locations', 'channelPartners', 'dealProbabilities',
];

function filtersFromParams(params: URLSearchParams): FilterState {
  const f: FilterState = { ...defaultFilters };
  const search = params.get('search');
  if (search) f.search = search;

  for (const key of ARRAY_FILTER_KEYS) {
    const raw = params.get(key);
    if (raw) (f as any)[key] = raw.split(',').filter(Boolean);
  }

  // Legacy single-value params (from dashboard deep links)
  if (f.sectors.length === 0 && params.get('sector')) f.sectors = [params.get('sector')!];
  if (f.statuses.length === 0 && params.get('status')) f.statuses = [params.get('status')!];
  if (f.dealProbabilities.length === 0 && params.get('dealProbability')) f.dealProbabilities = [params.get('dealProbability')!];

  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  if (dateFrom) f.dateFrom = new Date(dateFrom);
  if (dateTo) f.dateTo = new Date(dateTo);

  const minVal = params.get('minContractValue');
  const maxVal = params.get('maxContractValue');
  if (minVal) f.minContractValue = Number(minVal);
  if (maxVal) f.maxContractValue = Number(maxVal);

  return f;
}

function filtersToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);

  for (const key of ARRAY_FILTER_KEYS) {
    const arr = (filters as any)[key] as string[];
    if (arr && arr.length > 0) params.set(key, arr.join(','));
  }

  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom.toISOString());
  if (filters.dateTo) params.set('dateTo', filters.dateTo.toISOString());
  if (filters.minContractValue) params.set('minContractValue', String(filters.minContractValue));
  if (filters.maxContractValue) params.set('maxContractValue', String(filters.maxContractValue));

  return params;
}

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Derive filters from URL — single source of truth
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setSearchParams(filtersToParams(newFilters), { replace: true });
  }, [setSearchParams]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [importOpen, setImportOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Calculate page title based on sector filter
  const sectorParam = filters.sectors.length === 1 ? filters.sectors[0] : null;
  const pageTitle = sectorParam && sectorDisplayNames[sectorParam] 
    ? sectorDisplayNames[sectorParam] 
    : 'Projects';
  const { canCreateProjects } = usePermissions();

  // Fetch projects from backend
  const { data: backendProjects, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const projects = await projectsService.getAll();
        return projects;
      } catch (err) {
        console.error('[Projects Page] Error fetching projects:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch team members for filter dropdowns
  const { data: teamMembersList = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all tasks to get accurate counts per project (same source as ProjectDetail page)
  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => tasksService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Merge task data from the tasks API into projects so ProjectCard can rely on tasks.length (same as ProjectDetail)
  const projects: Project[] = useMemo(() => {
    const raw = Array.isArray(backendProjects) ? backendProjects : [];
    if (raw.length === 0) return [];

    const tasksByProject = new Map<string, typeof allTasks>();

    for (const task of allTasks) {
      if (!task?.projectId) continue;
      const projectKey = String(task.projectId);
      const existing = tasksByProject.get(projectKey) ?? [];
      existing.push(task);
      tasksByProject.set(projectKey, existing);
    }

    return raw.map((p) => {
      const existingTasks = Array.isArray(p.tasks) ? p.tasks : [];
      const syncedTasks = tasksByProject.get(String(p.id)) ?? existingTasks;
      const syncedCompletedTasks = syncedTasks.filter((t) => t.status === 'completed').length;

      return {
        ...p,
        tasks: syncedTasks,
        tasksCount: Math.max(p.tasksCount ?? 0, syncedTasks.length),
        completedTasksCount: Math.max(p.completedTasksCount ?? 0, syncedCompletedTasks),
      };
    });
  }, [backendProjects, allTasks]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch = 
          project.name.toLowerCase().includes(search) ||
          project.clientName?.toLowerCase().includes(search) ||
          project.oem?.toLowerCase().includes(search) ||
          project.location?.toLowerCase().includes(search) ||
          project.channelPartner?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Multi-select filters (empty array = no filter / show all)
      if (filters.sectors.length > 0 && !filters.sectors.includes(project.sector)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(project.status)) return false;
      if (filters.pipelineStages.length > 0 && !filters.pipelineStages.includes(project.pipelineStage)) return false;
      if (filters.businessSegments.length > 0 && !filters.businessSegments.includes(project.businessSegment)) return false;
      
      // Team filters (compare as strings since backend may return numeric IDs)
      if (filters.projectLeads.length > 0 && (!project.projectLeadId || !filters.projectLeads.includes(String(project.projectLeadId)))) return false;
      if (filters.assignees.length > 0 && (!project.assigneeId || !filters.assignees.includes(String(project.assigneeId)))) return false;
      
      // Multi-select text filters
      if (filters.clientNames.length > 0 && (!project.clientName || !filters.clientNames.includes(project.clientName.trim()))) return false;
      if (filters.oems.length > 0 && (!project.oem || !filters.oems.includes(project.oem.trim()))) return false;
      if (filters.locations.length > 0 && (!project.location || !filters.locations.includes(project.location.trim()))) return false;
      if (filters.channelPartners.length > 0 && (!project.channelPartner || !filters.channelPartners.includes(project.channelPartner.trim()))) return false;
      
      // Deal Probability filter
      if (filters.dealProbabilities.length > 0 && (!project.dealProbability || !filters.dealProbabilities.includes(project.dealProbability))) return false;
      
      // Date filters
      if (filters.dateFrom && project.startDate && new Date(project.startDate) < filters.dateFrom) return false;
      if (filters.dateTo && project.startDate && new Date(project.startDate) > filters.dateTo) return false;
      
      // Value filters
      if (filters.minContractValue && (project.contractValueUSD || 0) < filters.minContractValue) return false;
      if (filters.maxContractValue && (project.contractValueUSD || 0) > filters.maxContractValue) return false;
      
      return true;
    });
  }, [projects, filters]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setIsDeleting(true);
    let success = 0;
    let failed = 0;

    const BATCH = 10;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map(id => projectsService.delete(id)));
      results.forEach(r => r.status === 'fulfilled' ? success++ : failed++);
    }

    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['projectStats'] });
    setIsDeleting(false);
    exitSelectMode();

    if (failed === 0) {
      toast.success(`${success} project(s) deleted successfully`);
    } else {
      toast.warning(`${success} deleted, ${failed} failed`);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${filteredProjects.length} projects found`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border border-border rounded-md">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-r-none">
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-l-none">
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const filterSummary: ProjectFilterSummary = {
                search: filters.search || undefined,
                sectors: filters.sectors,
                statuses: filters.statuses,
                pipelineStages: filters.pipelineStages,
                clientNames: filters.clientNames,
                projectLeads: filters.projectLeads,
              };
              generateProjectsReport(filteredProjects, filterSummary, pageTitle + ' Report');
              toast.success('PDF report generated');
            }}
            disabled={filteredProjects.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <ExportProjectsButton />
          {canCreateProjects && (
            <>
              {!selectMode ? (
                <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Select
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={exitSelectMode}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button asChild>
                <Link to="/projects/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
          <Checkbox
            checked={filteredProjects.length > 0 && selectedIds.size === filteredProjects.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} of {filteredProjects.length} selected
          </span>
          <div className="flex-1" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={selectedIds.size === 0 || isDeleting}>
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} project(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All selected projects and their associated data will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <ProjectImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <AdvancedFilters filters={filters} onFiltersChange={handleFiltersChange} projects={projects} teamMembers={teamMembersList} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-4"}>
          {filteredProjects.map((project, idx) => (
            <div key={project.id}>
              <ProjectCard
                project={project}
                selectable={selectMode}
                selected={selectedIds.has(project.id)}
                onSelectToggle={toggleSelect}
              />
              {viewMode === 'list' && idx < filteredProjects.length - 1 && (
                <div className="border-b border-border mt-4" />
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects match your filters.</p>
          <Button variant="link" onClick={() => handleFiltersChange(defaultFilters)}>Clear filters</Button>
        </div>
      )}
    </div>
  );
}
