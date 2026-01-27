import { useState } from 'react';
import { Sector, PipelineStage, BusinessSegment, PIPELINE_STAGES } from '@/types';
import { sectors, businessSegments, teamMembers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Filter, 
  X, 
  CalendarIcon, 
  ChevronDown,
  Search 
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface FilterState {
  search: string;
  sector: Sector | 'all';
  status: string;
  pipelineStage: PipelineStage | 'all';
  businessSegment: BusinessSegment | 'all';
  projectLead: string;
  assignee: string;
  oem: string;
  location: string;
  channelPartner: string;
  dealProbability: 'all' | 'low' | 'medium' | 'high' | 'critical';
  dateFrom?: Date;
  dateTo?: Date;
  minContractValue?: number;
  maxContractValue?: number;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

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
  dealProbability: 'all',
};

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return false;
    if (typeof value === 'string') return value !== '' && value !== 'all';
    if (typeof value === 'number') return value !== undefined;
    return value !== undefined;
  }).length;

  const handleReset = () => {
    onFiltersChange(defaultFilters);
  };

  const statuses = ['all', 'active', 'on-hold', 'completed'];

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
                  <Label>Sector</Label>
                  <Select
                    value={filters.sector}
                    onValueChange={(value) => onFiltersChange({ ...filters, sector: value as Sector | 'all' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sectors</SelectItem>
                      {sectors.map((sector) => (
                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status === 'all' ? 'All Status' : status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pipeline Stage</Label>
                  <Select
                    value={filters.pipelineStage}
                    onValueChange={(value) => onFiltersChange({ ...filters, pipelineStage: value as PipelineStage | 'all' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Business Segment</Label>
                  <Select
                    value={filters.businessSegment}
                    onValueChange={(value) => onFiltersChange({ ...filters, businessSegment: value as BusinessSegment | 'all' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Segments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Segments</SelectItem>
                      {businessSegments.map((segment) => (
                        <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Label>Project Lead</Label>
                    <Select
                      value={filters.projectLead}
                      onValueChange={(value) => onFiltersChange({ ...filters, projectLead: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Project Leads" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Project Leads</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select
                      value={filters.assignee}
                      onValueChange={(value) => onFiltersChange({ ...filters, assignee: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Assignees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>OEM</Label>
                    <Input
                      placeholder="Filter by OEM"
                      value={filters.oem}
                      onChange={(e) => onFiltersChange({ ...filters, oem: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="Filter by location"
                      value={filters.location}
                      onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Channel Partner</Label>
                    <Input
                      placeholder="Filter by channel partner"
                      value={filters.channelPartner}
                      onChange={(e) => onFiltersChange({ ...filters, channelPartner: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Deal Probability</Label>
                    <Select
                      value={filters.dealProbability}
                      onValueChange={(value) => onFiltersChange({ ...filters, dealProbability: value as FilterState['dealProbability'] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Deal Probabilities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Deal Probabilities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
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
          {filters.sector !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Sector: {filters.sector}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, sector: 'all' })}
              />
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              Status: {filters.status}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, status: 'all' })}
              />
            </Badge>
          )}
          {filters.pipelineStage !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              Stage: {PIPELINE_STAGES.find(s => s.value === filters.pipelineStage)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, pipelineStage: 'all' })}
              />
            </Badge>
          )}
          {filters.businessSegment !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Segment: {filters.businessSegment}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, businessSegment: 'all' })}
              />
            </Badge>
          )}
          {filters.projectLead !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Lead: {teamMembers.find(m => m.id === filters.projectLead)?.name}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, projectLead: 'all' })}
              />
            </Badge>
          )}
          {filters.oem && (
            <Badge variant="secondary" className="gap-1">
              OEM: {filters.oem}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, oem: '' })}
              />
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="gap-1">
              Location: {filters.location}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, location: '' })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
