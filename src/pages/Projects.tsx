import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { AdvancedFilters, FilterState } from '@/components/projects/AdvancedFilters';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { Button } from '@/components/ui/button';
import { Plus, Grid3X3, List, Loader2, Upload, Trash2, X, RefreshCw } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Project, Sector } from '@/types';
import { ProjectImportDialog } from '@/components/projects/ProjectImportDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const defaultFilters: FilterState = {
  search: '',
  sector: 'all',
  status: 'all',
  pipelineStage: 'all',
  businessSegment: 'all',
  projectLead: 'all',
  assignee: 'all',
  clientName: '',
  oem: '',
  location: '',
  channelPartner: '',
  dealProbability: 'all',
};

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

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const sectorParam = searchParams.get('sector');
  const statusParam = searchParams.get('status');
  const dealProbabilityParam = searchParams.get('dealProbability');
  
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...defaultFilters,
    sector: (sectorParam as Sector | 'all') || 'all',
    status: statusParam || 'all',
    dealProbability: (dealProbabilityParam as FilterState['dealProbability']) || 'all',
  }));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [importOpen, setImportOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Update filters when URL params change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      sector: (sectorParam as Sector | 'all') || 'all',
      status: statusParam || 'all',
      dealProbability: (dealProbabilityParam as FilterState['dealProbability']) || 'all',
    }));
  }, [sectorParam, statusParam, dealProbabilityParam]);
  
  // Calculate page title based on sector filter
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

  // Use backend data only - no mock fallback
  const projects: Project[] = Array.isArray(backendProjects) ? backendProjects : [];

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
      
      // Basic filters
      if (filters.sector !== 'all' && project.sector !== filters.sector) return false;
      if (filters.status !== 'all' && project.status !== filters.status) return false;
      if (filters.pipelineStage !== 'all' && project.pipelineStage !== filters.pipelineStage) return false;
      if (filters.businessSegment !== 'all' && project.businessSegment !== filters.businessSegment) return false;
      
      // Team filters
      if (filters.projectLead !== 'all' && project.projectLeadId !== filters.projectLead) return false;
      if (filters.assignee !== 'all' && project.assigneeId !== filters.assignee) return false;
      
      // Text filters
      if (filters.clientName && !project.clientName?.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
      if (filters.oem && !project.oem?.toLowerCase().includes(filters.oem.toLowerCase())) return false;
      if (filters.location && !project.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.channelPartner && !project.channelPartner?.toLowerCase().includes(filters.channelPartner.toLowerCase())) return false;
      
      // Deal Probability filter
      if (filters.dealProbability !== 'all' && project.dealProbability !== filters.dealProbability) return false;
      
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

      <AdvancedFilters filters={filters} onFiltersChange={setFilters} projects={projects} teamMembers={teamMembersList} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              selectable={selectMode}
              selected={selectedIds.has(project.id)}
              onSelectToggle={toggleSelect}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects match your filters.</p>
          <Button variant="link" onClick={() => setFilters(defaultFilters)}>Clear filters</Button>
        </div>
      )}
    </div>
  );
}
