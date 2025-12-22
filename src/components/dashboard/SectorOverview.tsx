import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { sectors, sectorColors, sectorIcons, projects } from '@/data/mockData';
import { Sector } from '@/types';

export function SectorOverview() {
  const sectorStats = sectors.map(sector => {
    const sectorProjects = projects.filter(p => p.sector === sector);
    const avgProgress = sectorProjects.length 
      ? Math.round(sectorProjects.reduce((acc, p) => acc + p.progress, 0) / sectorProjects.length)
      : 0;
    
    return {
      sector,
      projectCount: sectorProjects.length,
      avgProgress,
      activeCount: sectorProjects.filter(p => p.status === 'active').length,
    };
  });

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
