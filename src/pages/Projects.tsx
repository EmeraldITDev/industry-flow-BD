import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { AdvancedFilters, FilterState, defaultFilters } from '@/components/projects/AdvancedFilters';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { Button } from '@/components/ui/button';
import { Plus, Grid3X3, List, Loader2, Upload, Trash2, X, RefreshCw } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Project, Sector } from '@/types';
import { ProjectImportDialog } from '@/components/projects/ProjectImportDialog';
import { ExportProjectsButton } from '@/components/projects/ExportProjectsButton';
import { GenerateReportButton } from '@/components/projects/GenerateReportButton';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ProjectFilterSummary } from '@/lib/reportGenerator';
import { metricLabel, metricsService } from '@/services/metrics';

// Mapping for sector display names
const sectorDisplayNames: Record<string, string> = {
  'EMR_Aftermarket Services': 'EMR_Aftermarket Services Projects',
  'EMR_O&M': 'EMR_O&M Projects',
  'EMR_Special Projects': 'EMR_Special Projects',
  'EMR_Trading': 'EMR_Trading Projects',
  'EMR_Manufacturing': 'EMR_Manufacturing Projects',
};

// How many cards to mount per batch as the user scrolls
const PAGE_SIZE = 24;

// Array filter keys that map to URL params (comma-separated)
const ARRAY_FILTER_KEYS: (keyof FilterState)[] = [
  'businessVerticals', 'sectors', 'statuses', 'pipelineStages', 'businessSegments',
  'products', 'subproducts',
  'projectLeads', 'assignees', 'clientNames', 'oems',
  'locations', 'channelPartners', 'dealProbabilities',
];

function filtersFromParams(params: URLSearchParams): FilterState {
  const f: FilterState = { ...defaultFilters };
  const search = params.get('search');
  if (search) f.search = search;

  for (const key of ARRAY_FILTER_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;

    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          (f as any)[key] = parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
          continue;
        }
      } catch {
        // Fall back to legacy comma-separated parsing below.
      }
    }

    (f as any)[key] = raw.split(',').filter(Boolean);
  }

  // Legacy single-value params (from dashboard deep links)
  if (f.businessVerticals.length === 0 && params.get('businessVertical')) f.businessVerticals = [params.get('businessVertical')!];
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
    if (arr && arr.length > 0) params.set(key, JSON.stringify(arr));
  }

  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom.toISOString());
  if (filters.dateTo) params.set('dateTo', filters.dateTo.toISOString());
  if (filters.minContractValue) params.set('minContractValue', String(filters.minContractValue));
  if (filters.maxContractValue) params.set('maxContractValue', String(filters.maxContractValue));

  return params;
}

function toDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function filterStateToApiParams(filters: FilterState): Record<string, string | number> {
  const params: Record<string, string | number> = { lean: 1, per_page: 50 };
  if (filters.search) params.search = filters.search;
  for (const key of ARRAY_FILTER_KEYS) {
    const arr = filters[key];
    if (Array.isArray(arr) && arr.length > 0) params[key] = JSON.stringify(arr);
  }
  if (filters.dateFrom) params.from = toDateParam(filters.dateFrom);
  if (filters.dateTo) params.to = toDateParam(filters.dateTo);
  if (filters.minContractValue != null) params.minContractValue = filters.minContractValue;
  if (filters.maxContractValue != null) params.maxContractValue = filters.maxContractValue;
  return params;
}

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Derive filters from URL — single source of truth
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const metric = searchParams.get('metric') || '';
  const isMetricDrill = metric !== '';
  const metricFrom = searchParams.get('from') || '';
  const metricTo = searchParams.get('to') || '';
  const metricPeriod = searchParams.get('period') || '';

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    const params = filtersToParams(newFilters);
    const metricParam = searchParams.get('metric');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period');
    if (metricParam) params.set('metric', metricParam);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (period) params.set('period', period);
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [importOpen, setImportOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Calculate page title based on sector filter
  const sectorParam = filters.businessVerticals.length === 1 ? filters.businessVerticals[0] : null;
  const pageTitle = isMetricDrill
    ? metricLabel(metric)
    : sectorParam && sectorDisplayNames[sectorParam]
      ? sectorDisplayNames[sectorParam]
      : 'Projects';
  const { canCreateProjects } = usePermissions();

  const {
    data: metricResult,
    isLoading: metricLoading,
    refetch: refetchMetric,
    isFetching: metricFetching,
  } = useQuery({
    queryKey: ['metric-records', metric, metricFrom, metricTo, metricPeriod],
    enabled: isMetricDrill,
    queryFn: () =>
      metricsService.getAllRecords(metric, {
        ...(metricFrom ? { from: metricFrom } : {}),
        ...(metricTo ? { to: metricTo } : {}),
        ...(metricPeriod ? { period: metricPeriod } : {}),
      }),
    staleTime: 60 * 1000,
  });

  const apiParams = useMemo(() => filterStateToApiParams(filters), [filters]);

  const {
    data: listPages,
    isLoading: listLoading,
    refetch: refetchList,
    isFetching: listFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['projects-list', apiParams],
    queryFn: ({ pageParam }) => projectsService.list({ ...apiParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.lastPage ? last.page + 1 : undefined),
    staleTime: 60 * 1000,
    enabled: !isMetricDrill,
  });

  const { data: facets = {} } = useQuery({
    queryKey: ['project-facets'],
    queryFn: () => projectsService.getFacets(),
    staleTime: 5 * 60 * 1000,
    enabled: !isMetricDrill,
  });

  // Fetch team members for filter dropdowns
  const { data: teamMembersList = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const projects: Project[] = useMemo(() => {
    if (isMetricDrill) return metricResult?.projects ?? [];
    return listPages?.pages.flatMap((page) => page.projects) ?? [];
  }, [isMetricDrill, metricResult, listPages]);

  const filteredProjects = projects;

  const isLoading = isMetricDrill ? metricLoading : listLoading;
  const isFetching = isMetricDrill ? metricFetching : (listFetching && !isFetchingNextPage);
  const refetch = isMetricDrill ? refetchMetric : refetchList;
  const headerCount = isMetricDrill
    ? (metricResult?.total ?? filteredProjects.length)
    : (listPages?.pages[0]?.total ?? filteredProjects.length);

  const reportFilterSummary = useMemo<ProjectFilterSummary>(() => ({
    search: filters.search || undefined,
    businessVerticals: filters.businessVerticals,
    sectors: filters.sectors,
    statuses: filters.statuses,
    pipelineStages: filters.pipelineStages,
    clientNames: filters.clientNames,
    projectLeads: filters.projectLeads,
  }), [filters]);

  // Render the list incrementally for metric drill-downs (full record sets).
  // The regular list pages from the API, so scroll loads the next server page.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [metric, metricFrom, metricTo, metricPeriod]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (isMetricDrill) {
          setVisibleCount((current) => Math.min(current + PAGE_SIZE, filteredProjects.length));
          return;
        }
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '800px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isMetricDrill, filteredProjects.length, visibleCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const visibleProjects = useMemo(
    () => (isMetricDrill ? filteredProjects.slice(0, visibleCount) : filteredProjects),
    [filteredProjects, visibleCount, isMetricDrill]
  );

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === filteredProjects.length ? new Set() : new Set(filteredProjects.map(p => p.id))
    );
  }, [filteredProjects]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

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
    queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    queryClient.invalidateQueries({ queryKey: ['project-facets'] });
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
            {isLoading ? 'Loading...' : `${headerCount} projects found`}
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
          <GenerateReportButton
            projects={filteredProjects}
            filters={reportFilterSummary}
            defaultTitle={pageTitle + ' Report'}
            preselectedProjectIds={
              selectMode && selectedIds.size > 0 ? selectedIds : undefined
            }
          />
          <ExportProjectsButton projects={filteredProjects} />
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

      {isMetricDrill ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing the same query as the dashboard card
            {metricResult ? ` · ${metricResult.totals.count} records` : ''}.
          </p>
          <Button variant="link" onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}>
            Clear
          </Button>
        </div>
      ) : (
        <AdvancedFilters filters={filters} onFiltersChange={handleFiltersChange} projects={projects} teamMembers={teamMembersList} facets={facets} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className={viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-4"}>
            {visibleProjects.map((project, idx) => (
              <div key={project.id}>
                <ProjectCard
                  project={project}
                  selectable={selectMode}
                  selected={selectedIds.has(project.id)}
                  onSelectToggle={toggleSelect}
                />
                {viewMode === 'list' && idx < visibleProjects.length - 1 && (
                  <div className="border-b border-border mt-4" />
                )}
              </div>
            ))}
          </div>
          {(isMetricDrill ? visibleCount < filteredProjects.length : hasNextPage) && (
            <div ref={sentinelRef} className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
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
