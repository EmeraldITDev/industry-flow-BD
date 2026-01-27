import { Project, Sector, PIPELINE_STAGES } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { sectorColors, sectorIcons, stageColors } from '@/data/mockData';
import { Calendar, Users, CheckSquare, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays, isValid } from 'date-fns';

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

function safeFormatDate(dateStr: string | undefined, formatStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return isValid(date) ? format(date, formatStr) : '-';
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    active: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    'on-hold': 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    completed: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  };

  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const stageLabel = PIPELINE_STAGES.find(s => s.value === project.pipelineStage)?.label || project.pipelineStage;
  
  // Check for inactivity warning (3+ days)
  let daysSinceUpdate = 0;
  if (project.lastStageUpdate) {
    const updateDate = new Date(project.lastStageUpdate);
    if (isValid(updateDate)) {
      daysSinceUpdate = differenceInDays(new Date(), updateDate);
    }
  }
  const showInactivityWarning = daysSinceUpdate >= 3 && project.status === 'active' && project.pipelineStage !== 'closure';

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium truncate max-w-[120px] sm:max-w-none ${sectorColors[project.sector as Sector] || 'bg-muted text-muted-foreground'}`}>
                {sectorIcons[project.sector as Sector] || '📁'} <span className="hidden sm:inline">{project.sector}</span>
              </span>
              <Badge variant="outline" className={`text-[10px] sm:text-xs ${statusColors[project.status] || ''}`}>
                {project.status}
              </Badge>
            </div>
            {showInactivityWarning && (
              <div className="flex items-center gap-1 text-destructive shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-xs">{daysSinceUpdate}d</span>
              </div>
            )}
          </div>
          <h3 className="font-semibold text-sm sm:text-lg mt-1.5 sm:mt-2 group-hover:text-primary transition-colors line-clamp-2">
            {project.name}
          </h3>
          <Badge variant="outline" className={`w-fit text-[10px] sm:text-xs ${stageColors[project.pipelineStage] || ''}`}>
            {stageLabel}
          </Badge>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 space-y-2 sm:space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
          
          {/* Client & Financial Values */}
          {(project.clientName || project.contractValueUSD || project.contractValueNGN) && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                <span className="text-muted-foreground truncate flex-1 min-w-0">{project.clientName || '-'}</span>
              </div>
              <div className="flex flex-col gap-1 text-[10px] sm:text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Contract Value:</span>
                  <div className="flex gap-1 sm:gap-2 shrink-0">
                    <span className="font-medium">{formatCurrency(project.contractValueNGN, 'NGN')}</span>
                    <span className="text-muted-foreground hidden sm:inline">/</span>
                    <span className="font-medium hidden sm:inline">{formatCurrency(project.contractValueUSD, 'USD')}</span>
                  </div>
                </div>
                {(project.marginValueUSD || project.marginValueNGN) && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Margin:</span>
                    <div className="flex gap-1 sm:gap-2 shrink-0">
                      <span className="font-medium text-chart-2">{formatCurrency(project.marginValueNGN, 'NGN')}</span>
                      <span className="text-muted-foreground hidden sm:inline">/</span>
                      <span className="font-medium text-chart-2 hidden sm:inline">{formatCurrency(project.marginValueUSD, 'USD')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress || 0}%</span>
            </div>
            <Progress value={project.progress || 0} className="h-1.5 sm:h-2" />
          </div>

          <div className="flex items-center justify-between text-[10px] sm:text-sm text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{project.teamSize || 0}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{completedTasks}/{tasks.length}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{safeFormatDate(project.startDate, 'MMM d')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
