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
      <CardHeader>
        <CardTitle>Sector Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sectorStats.map(stat => (
          <div key={stat.sector} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm ${sectorColors[stat.sector as Sector]}`}>
                  {sectorIcons[stat.sector as Sector]} {stat.sector}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stat.activeCount} active / {stat.projectCount} total
              </span>
            </div>
            <Progress value={stat.avgProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{stat.avgProgress}% avg. completion</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
