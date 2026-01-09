import { useParams, Link } from 'react-router-dom';
import { getProjectById, sectorColors, sectorIcons } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskList } from '@/components/tasks/TaskList';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { Sector } from '@/types';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  CheckSquare, 
  MoreHorizontal,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = getProjectById(id || '');
  const { canEditProjects, canAssignTasks } = usePermissions();

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Project not found</h2>
          <Button variant="link" asChild className="mt-4">
            <Link to="/projects">← Back to projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    'on-hold': 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    completed: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  };

  const completedTasks = project.tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-1 rounded-md font-medium ${sectorColors[project.sector as Sector]}`}>
              {sectorIcons[project.sector as Sector]} {project.sector}
            </span>
            <Badge variant="outline" className={statusColors[project.status]}>
              {project.status}
            </Badge>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold">{project.name}</h1>
        </div>
        {canEditProjects && (
          <Button variant="outline" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About this project</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>

          <Tabs defaultValue="kanban" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
                <TabsTrigger value="list">Task List</TabsTrigger>
              </TabsList>
              {canAssignTasks && (
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              )}
            </div>
            <TabsContent value="kanban" className="mt-0">
              <KanbanBoard tasks={project.tasks} />
            </TabsContent>
            <TabsContent value="list" className="mt-0">
              <TaskList tasks={project.tasks} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-3" />
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks completed</span>
                  <span className="font-medium">{completedTasks}/{project.tasks.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-accent">
                  <Calendar className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium text-sm">{format(new Date(project.startDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
              {project.endDate && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-accent">
                    <Calendar className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="font-medium text-sm">{format(new Date(project.endDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-accent">
                  <Users className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Team Size</p>
                  <p className="font-medium text-sm">{project.teamSize} members</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-accent">
                  <CheckSquare className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                  <p className="font-medium text-sm">{project.tasks.length} tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
