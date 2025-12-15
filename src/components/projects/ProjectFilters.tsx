import { Sector } from '@/types';
import { sectors, sectorIcons } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectFiltersProps {
  selectedSector: Sector | 'all';
  onSectorChange: (sector: Sector | 'all') => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export function ProjectFilters({ 
  selectedSector, 
  onSectorChange, 
  selectedStatus, 
  onStatusChange 
}: ProjectFiltersProps) {
  const statuses = ['all', 'active', 'on-hold', 'completed'];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Sector</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSector === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSectorChange('all')}
          >
            All Sectors
          </Button>
          {sectors.map(sector => (
            <Button
              key={sector}
              variant={selectedSector === sector ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSectorChange(sector)}
              className={cn(
                selectedSector === sector && "bg-primary text-primary-foreground"
              )}
            >
              {sectorIcons[sector]} {sector}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
        <div className="flex flex-wrap gap-2">
          {statuses.map(status => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => onStatusChange(status)}
              className="capitalize"
            >
              {status === 'all' ? 'All Status' : status}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
