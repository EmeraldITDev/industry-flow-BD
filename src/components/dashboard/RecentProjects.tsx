import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { sectorColors, sectorIcons } from '@/data/mockData';
import { Sector, Project } from '@/types';
import { projectsService } from '@/services/projects';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/context/CurrencyContext';

interface RecentProjectsProps {
  recentProjects?: Project[];
}

export function RecentProjects({ recentProjects: propRecentProjects }: RecentProjectsProps = {}) {
  const { formatCurrency, getContractValue, getMarginValue } = useCurrency();
  
  // Use provided recent projects from stats API, or fetch all projects as fallback
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
    enabled: !propRecentProjects, // Only fetch if not provided via props
  });

  const recentProjects = propRecentProjects || ((projects || [])
    .filter((p: Project) => p.status === 'active')
    .slice(0, 4));

  const statusColors = {
    active: 'bg-chart-1/20 text-chart-1',
    'on-hold': 'bg-chart-5/20 text-chart-5',
    completed: 'bg-chart-2/20 text-chart-2',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Active Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Active Projects</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-3">
          <Link to="/projects" className="flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
        {recentProjects.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No active projects yet</p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/projects/new">Create your first project</Link>
            </Button>
          </div>
        ) : (
          recentProjects.map((project: Project) => (
            <Link 
              key={project.id} 
              to={`/projects/${project.id}`}
              className="block p-2.5 sm:p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all"
            >
              <div className="flex items-start justify-between mb-1.5 sm:mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                    <span className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 rounded ${sectorColors[project.sector as Sector] || 'bg-muted text-muted-foreground'}`}>
                      {sectorIcons[project.sector as Sector] || '📁'}
                    </span>
                    <Badge variant="outline" className={`text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-2 ${statusColors[project.status]}`}>
                      {project.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-foreground text-xs sm:text-base truncate">{project.name}</h4>
                </div>
              </div>
              <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1 mb-1.5 sm:mb-3">
                {project.description || 'No description'}
              </p>
              {(() => {
                const contractValue = getContractValue(project);
                const marginValue = getMarginValue(project);
                return contractValue > 0 || marginValue > 0 ? (
                  <div className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs">
                    {contractValue > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="font-medium">{formatCurrency(contractValue)}</span>
                      </div>
                    )}
                    {marginValue > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Margin:</span>
                        <span className="font-medium text-chart-2">{formatCurrency(marginValue)}</span>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <div className="flex items-center justify-between text-[10px] sm:text-sm gap-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{project.teamSize || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Progress value={project.progress || 0} className="w-10 sm:w-20 h-1 sm:h-2" />
                  <span className="text-[10px] sm:text-xs font-medium">{project.progress || 0}%</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
