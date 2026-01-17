import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sectorColors, sectorIcons } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskList } from '@/components/tasks/TaskList';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog';
import { Project, Sector, TaskStatus } from '@/types';
import { projectsService } from '@/services/projects';
import { tasksService } from '@/services/tasks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  CheckSquare, 
  MoreHorizontal,
  Plus,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { safeFormatDate } from '@/lib/dateUtils';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { canEditProjects, canAssignTasks } = usePermissions();

  // Fetch tasks separately for refresh capability
  const { data: projectTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => id ? tasksService.getByProject(id) : Promise.resolve([]),
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  const fetchProject = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await projectsService.getById(id);
      console.log('Project API response:', response);
      
      // Handle both direct data and wrapped { data: ... } response
      const data: any = (response as any)?.data || response;
      
      // Map snake_case fields from Laravel to camelCase for frontend
      const mappedProject: Project = {
        id: data.id,
        name: data.name || '',
        description: data.description || '',
        sector: data.sector || 'technology',
        status: data.status || 'active',
        progress: data.progress || 0,
        startDate: data.start_date || data.startDate || '',
        endDate: data.end_date || data.endDate,
        budget: data.budget,
        spentBudget: data.spent_budget || data.spentBudget,
        teamSize: data.team_size || data.teamSize || 0,
        clientName: data.client_name || data.clientName,
        clientContact: data.client_contact || data.clientContact,
        oem: data.oem,
        location: data.location,
        businessSegment: data.business_segment || data.businessSegment,
        pipelineStage: data.pipeline_stage || data.pipelineStage,
        pipelineIntakeDate: data.pipeline_intake_date || data.pipelineIntakeDate,
        expectedCloseDate: data.expected_close_date || data.expectedCloseDate,
        product: data.product,
        subProduct: data.sub_product || data.subProduct,
        channelPartner: data.channel_partner || data.channelPartner,
        contractValueNGN: data.contract_value_ngn || data.contractValueNGN,
        contractValueUSD: data.contract_value_usd || data.contractValueUSD,
        marginPercentNGN: data.margin_percent_ngn || data.marginPercentNGN,
        marginPercentUSD: data.margin_percent_usd || data.marginPercentUSD,
        projectLeadId: data.project_lead_id || data.projectLeadId,
        assigneeId: data.assignee_id || data.assigneeId,
        projectLeadComments: data.project_lead_comments || data.projectLeadComments,
        riskLevel: data.risk_level || data.riskLevel,
        tasks: data.tasks || [],
        milestones: data.milestones || [],
        documents: data.documents || [],
        stageHistory: data.stage_history || data.stageHistory || [],
      };
      
      console.log('Mapped project:', mappedProject);
      setProject(mappedProject);
    } catch (err: any) {
      console.error('Failed to fetch project:', err);
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error loading project</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" onClick={fetchProject}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="link" asChild>
              <Link to="/projects">← Back to projects</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  // Use tasks from API or fallback to project.tasks
  const tasks = projectTasks.length > 0 ? projectTasks : (project.tasks || []);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const handleTaskCreated = () => {
    refetchTasks();
    fetchProject(); // Refresh project to update task count
  };

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    try {
      // Status conversion is handled by tasksService
      await tasksService.updateStatus(taskId, newStatus);
      toast.success('Task status updated');
      refetchTasks();
      fetchProject();
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      toast.error(err.response?.data?.message || 'Failed to update task status');
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await tasksService.delete(taskId);
      toast.success('Task deleted successfully');
      refetchTasks();
      fetchProject();
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await projectsService.delete(id);
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      toast.error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'on-hold' | 'completed') => {
    if (!id || !project) return;
    
    try {
      await projectsService.update(id, { status: newStatus });
      setProject({ ...project, status: newStatus });
      toast.success(`Project status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err: any) {
      console.error('Failed to update project status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0 self-start">
          <Link to="/projects">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium ${sectorColors[project.sector as Sector] || 'bg-muted text-muted-foreground'}`}>
              {sectorIcons[project.sector as Sector] || '📁'} <span className="hidden sm:inline">{project.sector}</span>
            </span>
            <Badge variant="outline" className={`text-[10px] sm:text-xs ${statusColors[project.status] || ''}`}>
              {project.status}
            </Badge>
          </div>
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold line-clamp-2">{project.name}</h1>
        </div>
        {canEditProjects && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/projects/${id}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {project.status !== 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Set Active
                </DropdownMenuItem>
              )}
              {project.status !== 'on-hold' && (
                <DropdownMenuItem onClick={() => handleStatusChange('on-hold')}>
                  <PauseCircle className="w-4 h-4 mr-2" />
                  Put On Hold
                </DropdownMenuItem>
              )}
              {project.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Completed
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone and will permanently remove all associated tasks and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">About this project</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <p className="text-xs sm:text-sm text-muted-foreground">{project.description || 'No description provided.'}</p>
              
              {/* Additional project details */}
              <div className="mt-3 sm:mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
                {project.clientName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium text-sm">{project.clientName}</p>
                  </div>
                )}
                {project.clientContact && (
                  <div>
                    <p className="text-xs text-muted-foreground">Client Contact</p>
                    <p className="font-medium text-sm">{project.clientContact}</p>
                  </div>
                )}
                {project.oem && (
                  <div>
                    <p className="text-xs text-muted-foreground">OEM</p>
                    <p className="font-medium text-sm">{project.oem}</p>
                  </div>
                )}
                {project.location && (
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium text-sm">{project.location}</p>
                  </div>
                )}
                {project.businessSegment && (
                  <div>
                    <p className="text-xs text-muted-foreground">Business Segment</p>
                    <p className="font-medium text-sm">{project.businessSegment}</p>
                  </div>
                )}
                {project.pipelineStage && (
                  <div>
                    <p className="text-xs text-muted-foreground">Pipeline Stage</p>
                    <p className="font-medium text-sm capitalize">{project.pipelineStage}</p>
                  </div>
                )}
                {project.product && (
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="font-medium text-sm">{project.product}</p>
                  </div>
                )}
                {project.subProduct && (
                  <div>
                    <p className="text-xs text-muted-foreground">Sub Product</p>
                    <p className="font-medium text-sm">{project.subProduct}</p>
                  </div>
                )}
                {project.channelPartner && (
                  <div>
                    <p className="text-xs text-muted-foreground">Channel Partner</p>
                    <p className="font-medium text-sm">{project.channelPartner}</p>
                  </div>
                )}
                {project.contractValueNGN && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contract Value (NGN)</p>
                    <p className="font-medium text-sm">₦{project.contractValueNGN.toLocaleString()}</p>
                  </div>
                )}
                {project.contractValueUSD && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contract Value (USD)</p>
                    <p className="font-medium text-sm">${project.contractValueUSD.toLocaleString()}</p>
                  </div>
                )}
                {project.marginPercentNGN !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Margin % (NGN)</p>
                    <p className="font-medium text-sm">{project.marginPercentNGN}%</p>
                  </div>
                )}
                {project.marginPercentUSD !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Margin % (USD)</p>
                    <p className="font-medium text-sm">{project.marginPercentUSD}%</p>
                  </div>
                )}
                {project.riskLevel && (
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <Badge variant="outline" className="capitalize">{project.riskLevel}</Badge>
                  </div>
                )}
                {project.budget && (
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="font-medium text-sm">${project.budget.toLocaleString()}</p>
                  </div>
                )}
              </div>
              {project.projectLeadComments && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Project Lead Comments</p>
                  <p className="text-sm">{project.projectLeadComments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="kanban" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
                <TabsTrigger value="list">Task List</TabsTrigger>
              </TabsList>
              {canAssignTasks && (
                <Button size="sm" onClick={() => setAddTaskOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              )}
            </div>
            <TabsContent value="kanban" className="mt-0">
              <KanbanBoard 
                tasks={tasks} 
                onTaskMove={handleTaskMove}
                onTaskDelete={handleTaskDelete}
              />
            </TabsContent>
            <TabsContent value="list" className="mt-0">
              <TaskList 
                tasks={tasks}
                onTaskDelete={handleTaskDelete}
              />
            </TabsContent>
          </Tabs>

          {/* Add Task Dialog */}
          <AddTaskDialog
            open={addTaskOpen}
            onOpenChange={setAddTaskOpen}
            projectId={id || ''}
            onTaskCreated={handleTaskCreated}
          />
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
                  <span className="font-medium">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-3" />
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks completed</span>
                  <span className="font-medium">{completedTasks}/{tasks.length}</span>
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
                  <p className="font-medium text-sm">
                    {safeFormatDate(project.startDate, 'MMM d, yyyy', 'Not set')}
                  </p>
                </div>
              </div>
              {project.endDate && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-accent">
                    <Calendar className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="font-medium text-sm">{safeFormatDate(project.endDate, 'MMM d, yyyy', 'Not set')}</p>
                  </div>
                </div>
              )}
              {project.expectedCloseDate && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-accent">
                    <Calendar className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Close</p>
                    <p className="font-medium text-sm">{safeFormatDate(project.expectedCloseDate, 'MMM d, yyyy', 'Not set')}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-accent">
                  <Users className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Team Size</p>
                  <p className="font-medium text-sm">{project.teamSize || 0} members</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-accent">
                  <CheckSquare className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                  <p className="font-medium text-sm">{tasks.length} tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
