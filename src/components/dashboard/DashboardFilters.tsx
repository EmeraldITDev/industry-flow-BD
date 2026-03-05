import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, PipelineStage, BusinessSegment, PIPELINE_STAGES } from '@/types';
import { businessSegments } from '@/data/mockData';
import { format } from 'date-fns';

export interface DashboardFilterState {
  projectLeads: string[];
  pipelineStages: PipelineStage[];
  businessSegments: BusinessSegment[];
  startDates: string[];
}

export const defaultDashboardFilters: DashboardFilterState = {
  projectLeads: [],
  pipelineStages: [],
  businessSegments: [],
  startDates: [],
};

interface DashboardFiltersProps {
  filters: DashboardFilterState;
  onFiltersChange: (filters: DashboardFilterState) => void;
  projects: Project[];
}

export function DashboardFilters({ filters, onFiltersChange, projects }: DashboardFiltersProps) {
  // Extract unique project leads from multiple possible fields
  const uniqueLeads = useMemo(() => {
    const leads = new Set<string>();
    projects.forEach(p => {
      const lead = p.salesLead || p.projectLeadId || p.assigneeId;
      if (lead && typeof lead === 'string' && lead.trim()) leads.add(lead.trim());
    });
    return Array.from(leads).sort();
  }, [projects]);

  // Extract unique start dates (by month)
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    projects.forEach(p => {
      if (p.startDate) {
        try {
          const d = new Date(p.startDate);
          if (!isNaN(d.getTime())) {
            months.add(format(d, 'yyyy-MM'));
          }
        } catch {}
      }
    });
    return Array.from(months).sort().reverse();
  }, [projects]);

  const activeCount =
    filters.projectLeads.length +
    filters.pipelineStages.length +
    filters.businessSegments.length +
    filters.startDates.length;

  const handleClear = () => onFiltersChange(defaultDashboardFilters);

  const toggleItem = <T extends string>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground" />

      {/* Project Lead */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            Project Lead
            {filters.projectLeads.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {filters.projectLeads.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uniqueLeads.length === 0 && (
              <p className="text-xs text-muted-foreground">No project leads found</p>
            )}
            {uniqueLeads.map(lead => (
              <label key={lead} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={filters.projectLeads.includes(lead)}
                  onCheckedChange={() =>
                    onFiltersChange({ ...filters, projectLeads: toggleItem(filters.projectLeads, lead) })
                  }
                />
                {lead}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Pipeline Stage */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            Pipeline Stage
            {filters.pipelineStages.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {filters.pipelineStages.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {PIPELINE_STAGES.filter(s => s.value !== 'lost').map(stage => (
              <label key={stage.value} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={filters.pipelineStages.includes(stage.value)}
                  onCheckedChange={() =>
                    onFiltersChange({ ...filters, pipelineStages: toggleItem(filters.pipelineStages, stage.value) })
                  }
                />
                {stage.label}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Business Segment */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            Business Segment
            {filters.businessSegments.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {filters.businessSegments.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {businessSegments.map(seg => (
              <label key={seg} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={filters.businessSegments.includes(seg)}
                  onCheckedChange={() =>
                    onFiltersChange({ ...filters, businessSegments: toggleItem(filters.businessSegments, seg) })
                  }
                />
                {seg}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Start Date (by month) */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            Start Date
            {filters.startDates.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {filters.startDates.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uniqueMonths.length === 0 && (
              <p className="text-xs text-muted-foreground">No dates available</p>
            )}
            {uniqueMonths.map(month => (
              <label key={month} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={filters.startDates.includes(month)}
                  onCheckedChange={() =>
                    onFiltersChange({ ...filters, startDates: toggleItem(filters.startDates, month) })
                  }
                />
                {format(new Date(month + '-01'), 'MMM yyyy')}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={handleClear}>
          <X className="w-3 h-3" />
          Clear All
        </Button>
      )}
    </div>
  );
}

/** Helper: filter projects based on dashboard filters */
export function applyDashboardFilters(projects: Project[], filters: DashboardFilterState): Project[] {
  return projects.filter(p => {
    if (filters.projectLeads.length > 0) {
      const lead = p.salesLead || p.projectLeadId || p.assigneeId || '';
      if (!filters.projectLeads.includes(lead)) return false;
    }
    if (filters.pipelineStages.length > 0 && !filters.pipelineStages.includes(p.pipelineStage)) return false;
    if (filters.businessSegments.length > 0) {
      const seg = (p.businessSegment || p.sector) as string;
      if (!filters.businessSegments.includes(seg as BusinessSegment)) return false;
    }
    if (filters.startDates.length > 0) {
      if (!p.startDate) return false;
      try {
        const month = format(new Date(p.startDate), 'yyyy-MM');
        if (!filters.startDates.includes(month)) return false;
      } catch {
        return false;
      }
    }
    return true;
  });
}
