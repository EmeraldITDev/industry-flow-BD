import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { projects, sectorColors, sectorIcons } from '@/data/mockData';
import { Sector } from '@/types';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RecentProjects() {
  const recentProjects = projects
    .filter(p => p.status === 'active')
    .slice(0, 4);

  const statusColors = {
    active: 'bg-chart-1/20 text-chart-1',
    'on-hold': 'bg-chart-5/20 text-chart-5',
    completed: 'bg-chart-2/20 text-chart-2',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Projects</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects" className="flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentProjects.map(project => (
          <Link 
            key={project.id} 
            to={`/projects/${project.id}`}
            className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${sectorColors[project.sector as Sector]}`}>
                    {sectorIcons[project.sector as Sector]} {project.sector}
                  </span>
                  <Badge variant="outline" className={statusColors[project.status]}>
                    {project.status}
                  </Badge>
                </div>
                <h4 className="font-semibold text-foreground">{project.name}</h4>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
              {project.description}
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{project.teamSize} members</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={project.progress} className="w-20 h-2" />
                <span className="text-xs font-medium">{project.progress}%</span>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
