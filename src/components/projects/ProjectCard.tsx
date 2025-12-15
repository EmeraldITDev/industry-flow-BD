import { Project, Sector, PIPELINE_STAGES } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { sectorColors, sectorIcons, stageColors } from '@/data/mockData';
import { Calendar, Users, CheckSquare, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';

interface ProjectCardProps {
  project: Project;
}

function formatCurrency(value: number | undefined, currency: 'NGN' | 'USD'): string {
  if (!value) return '-';
  const symbol = currency === 'NGN' ? '₦' : '$';
  if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`;
  return `${symbol}${value}`;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    active: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    'on-hold': 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    completed: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  };

  const completedTasks = project.tasks.filter(t => t.status === 'completed').length;
  const stageLabel = PIPELINE_STAGES.find(s => s.value === project.pipelineStage)?.label || project.pipelineStage;
  
  // Check for inactivity warning (3+ days)
  const daysSinceUpdate = project.lastStageUpdate 
    ? differenceInDays(new Date(), new Date(project.lastStageUpdate))
    : 0;
  const showInactivityWarning = daysSinceUpdate >= 3 && project.status === 'active' && project.pipelineStage !== 'closure';

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-md font-medium ${sectorColors[project.sector as Sector]}`}>
                {sectorIcons[project.sector as Sector]} {project.sector}
              </span>
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status}
              </Badge>
            </div>
            {showInactivityWarning && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">{daysSinceUpdate}d</span>
              </div>
            )}
          </div>
          <h3 className="font-semibold text-lg mt-2 group-hover:text-primary transition-colors line-clamp-2">
            {project.name}
          </h3>
          <Badge variant="outline" className={`w-fit ${stageColors[project.pipelineStage]}`}>
            {stageLabel}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
          
          {/* Client & Value */}
          {(project.clientName || project.contractValueUSD) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[50%]">{project.clientName || '-'}</span>
              <div className="flex gap-2 text-xs">
                <span className="font-medium">{formatCurrency(project.contractValueNGN, 'NGN')}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium">{formatCurrency(project.contractValueUSD, 'USD')}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{project.teamSize}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckSquare className="w-4 h-4" />
              <span>{completedTasks}/{project.tasks.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(project.startDate), 'MMM d')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
