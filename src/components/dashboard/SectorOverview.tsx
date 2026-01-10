import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { sectors, sectorColors, sectorIcons } from '@/data/mockData';
import { Sector, Project } from '@/types';
import { projectsService } from '@/services/projects';

export function SectorOverview() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const sectorStats = sectors.map(sector => {
    const sectorProjects = (projects || []).filter((p: Project) => p.sector === sector);
    const avgProgress = sectorProjects.length 
      ? Math.round(sectorProjects.reduce((acc: number, p: Project) => acc + (p.progress || 0), 0) / sectorProjects.length)
      : 0;
    
    return {
      sector,
      projectCount: sectorProjects.length,
      avgProgress,
      activeCount: sectorProjects.filter((p: Project) => p.status === 'active').length,
    };
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Sector Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-6">
          {sectors.map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Sector Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-6">
        {sectorStats.map(stat => (
          <div key={stat.sector} className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-sm ${sectorColors[stat.sector as Sector]}`}>
                {sectorIcons[stat.sector as Sector]} {stat.sector}
              </span>
              <span className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap">
                {stat.activeCount}/{stat.projectCount}
              </span>
            </div>
            <Progress value={stat.avgProgress} className="h-1.5 sm:h-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground text-right">{stat.avgProgress}%</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
