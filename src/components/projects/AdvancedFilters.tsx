import { useState, useMemo } from 'react';
import { Sector, PipelineStage, BusinessSegment, PIPELINE_STAGES, Project, TeamMember } from '@/types';
import { sectors, businessSegments } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MultiSearchableSelect } from '@/components/ui/multi-searchable-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  Filter, 
  X, 
  CalendarIcon, 
  ChevronDown,
  Search 
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ALL_PROJECT_STATUSES, getStatusLabel } from '@/lib/stageStatusRules';

export interface FilterState {
  search: string;
  sectors: string[];
  statuses: string[];
  pipelineStages: string[];
  businessSegments: string[];
  projectLeads: string[];
  assignees: string[];
  clientNames: string[];
  oems: string[];
  locations: string[];
  channelPartners: string[];
  dealProbabilities: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minContractValue?: number;
  maxContractValue?: number;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  projects?: Project[];
  teamMembers?: TeamMember[];
}

export const defaultFilters: FilterState = {
  search: '',
  sectors: [],
  statuses: [],
  pipelineStages: [],
  businessSegments: [],
  projectLeads: [],
  assignees: [],
  clientNames: [],
  oems: [],
  locations: [],
  channelPartners: [],
  dealProbabilities: [],
};

export function AdvancedFilters({ filters, onFiltersChange, projects = [], teamMembers = [] }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return value !== undefined;
    return value !== undefined;
  }).length;

  const handleReset = () => {
    onFiltersChange(defaultFilters);
  };

  // Build team member options from real data
  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((m) => map.set(String(m.id), m.name));
    return map;
  }, [teamMembers]);

  // Extract unique project leads from projects using team data
  const projectLeadOptions = useMemo(() => {
    const leadIds = new Set<string>();
    projects.forEach((p) => {
      const id = p.projectLeadId;
      if (id) leadIds.add(String(id));
    });
    return Array.from(leadIds)
      .map((id) => ({ value: id, label: teamNameMap.get(id) || `Lead #${id}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects, teamNameMap]);

  // Extract unique assignees from projects using team data
  const assigneeOptions = useMemo(() => {
    const assigneeIds = new Set<string>();
    projects.forEach((p) => {
      const id = p.assigneeId;
      if (id) assigneeIds.add(String(id));
    });
    return Array.from(assigneeIds)
      .map((id) => ({ value: id, label: teamNameMap.get(id) || `Assignee #${id}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects, teamNameMap]);

  // Extract unique clients
  const clientOptions = useMemo(() => {
    const clients = new Set<string>();
    projects.forEach((p) => {
      if (p.clientName?.trim()) clients.add(p.clientName.trim());
    });
    return Array.from(clients).sort().map((c) => ({ value: c, label: c }));
  }, [projects]);

  // Extract unique OEMs
  const oemOptions = useMemo(() => {
    const oems = new Set<string>();
    projects.forEach((p) => {
      if (p.oem?.trim()) oems.add(p.oem.trim());
    });
    return Array.from(oems).sort().map((o) => ({ value: o, label: o }));
  }, [projects]);

  // Extract unique locations
  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    projects.forEach((p) => {
      if (p.location?.trim()) locations.add(p.location.trim());
    });
    return Array.from(locations).sort().map((l) => ({ value: l, label: l }));
  }, [projects]);

  // Extract unique channel partners
  const channelPartnerOptions = useMemo(() => {
    const partners = new Set<string>();
    projects.forEach((p) => {
      if (p.channelPartner?.trim()) partners.add(p.channelPartner.trim());
    });
    return Array.from(partners).sort().map((cp) => ({ value: cp, label: cp }));
  }, [projects]);

  const pipelineStageOptions = PIPELINE_STAGES.map((stage) => ({
    value: stage.value,
    label: stage.label,
  }));

  const sectorOptions = sectors.map((s) => ({ value: s, label: s }));

  const segmentOptions = businessSegments.map((s) => ({ value: s, label: s }));

  const statusOptions = ALL_PROJECT_STATUSES.map((s) => ({
    value: s,
    label: getStatusLabel(s as any),
  }));

  const dealProbabilityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
    { value: 'uncertain', label: 'Uncertain' },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filter Button Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, clients, OEM..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Clear All
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              {/* Basic Filters */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pipeline Stage</Label>
                  <MultiSearchableSelect
                    values={filters.pipelineStages}
                    onValuesChange={(values) => onFiltersChange({ ...filters, pipelineStages: values })}
                    options={pipelineStageOptions}
                    placeholder="All Stages"
                    searchPlaceholder="Search stages..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Segment</Label>
                  <MultiSearchableSelect
                    values={filters.businessSegments}
                    onValuesChange={(values) => onFiltersChange({ ...filters, businessSegments: values })}
                    options={segmentOptions}
                    placeholder="All Segments"
                    searchPlaceholder="Search segments..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sector</Label>
                  <MultiSearchableSelect
                    values={filters.sectors}
                    onValuesChange={(values) => onFiltersChange({ ...filters, sectors: values })}
                    options={sectorOptions}
                    placeholder="All Sectors"
                    searchPlaceholder="Search sectors..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <MultiSearchableSelect
                    values={filters.statuses}
                    onValuesChange={(values) => onFiltersChange({ ...filters, statuses: values })}
                    options={statusOptions}
                    placeholder="All Status"
                    searchPlaceholder="Search statuses..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Lead</Label>
                  <MultiSearchableSelect
                    values={filters.projectLeads}
                    onValuesChange={(values) => onFiltersChange({ ...filters, projectLeads: values })}
                    options={projectLeadOptions}
                    placeholder="All Project Leads"
                    searchPlaceholder="Search project leads..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <MultiSearchableSelect
                    values={filters.assignees}
                    onValuesChange={(values) => onFiltersChange({ ...filters, assignees: values })}
                    options={assigneeOptions}
                    placeholder="All Assignees"
                    searchPlaceholder="Search assignees..."
                  />
                </div>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    Advanced Filters
                    <ChevronDown className={cn("w-4 h-4 transition-transform", isAdvancedOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <MultiSearchableSelect
                      values={filters.clientNames}
                      onValuesChange={(values) => onFiltersChange({ ...filters, clientNames: values })}
                      options={clientOptions}
                      placeholder="All Clients"
                      searchPlaceholder="Search clients..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>OEM</Label>
                    <MultiSearchableSelect
                      values={filters.oems}
                      onValuesChange={(values) => onFiltersChange({ ...filters, oems: values })}
                      options={oemOptions}
                      placeholder="All OEMs"
                      searchPlaceholder="Search OEMs..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <MultiSearchableSelect
                      values={filters.locations}
                      onValuesChange={(values) => onFiltersChange({ ...filters, locations: values })}
                      options={locationOptions}
                      placeholder="All Locations"
                      searchPlaceholder="Search locations..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Channel Partner</Label>
                    <MultiSearchableSelect
                      values={filters.channelPartners}
                      onValuesChange={(values) => onFiltersChange({ ...filters, channelPartners: values })}
                      options={channelPartnerOptions}
                      placeholder="All Channel Partners"
                      searchPlaceholder="Search channel partners..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Deal Probability</Label>
                    <MultiSearchableSelect
                      values={filters.dealProbabilities}
                      onValuesChange={(values) => onFiltersChange({ ...filters, dealProbabilities: values })}
                      options={dealProbabilityOptions}
                      placeholder="All Deal Probabilities"
                      searchPlaceholder="Search probabilities..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date From</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !filters.dateFrom && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'Select'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateFrom}
                            onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Date To</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !filters.dateTo && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateTo ? format(filters.dateTo, 'PP') : 'Select'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateTo}
                            onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Contract Value ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minContractValue || ''}
                        onChange={(e) => onFiltersChange({ 
                          ...filters, 
                          minContractValue: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Contract Value ($)</Label>
                      <Input
                        type="number"
                        placeholder="No limit"
                        value={filters.maxContractValue || ''}
                        onChange={(e) => onFiltersChange({ 
                          ...filters, 
                          maxContractValue: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button onClick={() => setIsOpen(false)} className="w-full">
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.sectors.map((s) => (
            <Badge key={`sector-${s}`} variant="secondary" className="gap-1">
              Sector: {s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, sectors: filters.sectors.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.statuses.map((s) => (
            <Badge key={`status-${s}`} variant="secondary" className="gap-1 capitalize">
              Status: {getStatusLabel(s as any)}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, statuses: filters.statuses.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.pipelineStages.map((s) => (
            <Badge key={`stage-${s}`} variant="secondary" className="gap-1 capitalize">
              Stage: {PIPELINE_STAGES.find(ps => ps.value === s)?.label || s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, pipelineStages: filters.pipelineStages.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.businessSegments.map((s) => (
            <Badge key={`segment-${s}`} variant="secondary" className="gap-1">
              Segment: {s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, businessSegments: filters.businessSegments.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.projectLeads.map((s) => (
            <Badge key={`lead-${s}`} variant="secondary" className="gap-1">
              Lead: {projectLeadOptions.find(o => o.value === s)?.label || s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, projectLeads: filters.projectLeads.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.assignees.map((s) => (
            <Badge key={`assignee-${s}`} variant="secondary" className="gap-1">
              Assignee: {assigneeOptions.find(o => o.value === s)?.label || s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, assignees: filters.assignees.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.clientNames.map((s) => (
            <Badge key={`client-${s}`} variant="secondary" className="gap-1">
              Client: {s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, clientNames: filters.clientNames.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.oems.map((s) => (
            <Badge key={`oem-${s}`} variant="secondary" className="gap-1">
              OEM: {s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, oems: filters.oems.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.locations.map((s) => (
            <Badge key={`loc-${s}`} variant="secondary" className="gap-1">
              Location: {s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, locations: filters.locations.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.channelPartners.map((s) => (
            <Badge key={`partner-${s}`} variant="secondary" className="gap-1">
              Partner: {s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, channelPartners: filters.channelPartners.filter(v => v !== s) }); }} />
            </Badge>
          ))}
          {filters.dealProbabilities.map((s) => (
            <Badge key={`prob-${s}`} variant="secondary" className="gap-1 capitalize">
              Probability: {s}
              <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, dealProbabilities: filters.dealProbabilities.filter(v => v !== s) }); }} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
