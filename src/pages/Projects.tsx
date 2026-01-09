import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { AdvancedFilters, FilterState } from '@/components/projects/AdvancedFilters';
import { projects as mockProjects } from '@/data/mockData';
import { projectsService } from '@/services/projects';
import { Button } from '@/components/ui/button';
import { Plus, Grid3X3, List, Loader2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Project } from '@/types';

const defaultFilters: FilterState = {
  search: '',
  sector: 'all',
  status: 'all',
  pipelineStage: 'all',
  businessSegment: 'all',
  projectLead: 'all',
  assignee: 'all',
  oem: '',
  location: '',
  channelPartner: '',
};

export default function Projects() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { canCreateProjects } = usePermissions();

  // Fetch projects from backend
  const { data: backendProjects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use backend data if available and valid array, fallback to mock data
  const projects: Project[] = Array.isArray(backendProjects) ? backendProjects : mockProjects;

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
      if (filters.oem && !project.oem?.toLowerCase().includes(filters.oem.toLowerCase())) return false;
      if (filters.location && !project.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.channelPartner && !project.channelPartner?.toLowerCase().includes(filters.channelPartner.toLowerCase())) return false;
      
      // Date filters
      if (filters.dateFrom && project.startDate && new Date(project.startDate) < filters.dateFrom) return false;
      if (filters.dateTo && project.startDate && new Date(project.startDate) > filters.dateTo) return false;
      
      // Value filters
      if (filters.minContractValue && (project.contractValueUSD || 0) < filters.minContractValue) return false;
      if (filters.maxContractValue && (project.contractValueUSD || 0) > filters.maxContractValue) return false;
      
      return true;
    });
  }, [projects, filters]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Projects</h1>
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
          {canCreateProjects && (
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      <AdvancedFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-2">Failed to load projects</p>
          <p className="text-muted-foreground text-sm mb-4">
            {(error as any)?.message || 'Please check your connection and try again'}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {!isLoading && !error && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects match your filters.</p>
          <Button variant="link" onClick={() => setFilters(defaultFilters)}>Clear filters</Button>
        </div>
      )}
    </div>
  );
}
