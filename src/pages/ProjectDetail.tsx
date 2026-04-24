import React from 'react';
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
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { Project, Sector, Task, TaskStatus } from '@/types';
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
  CheckCircle2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { safeFormatDate } from '@/lib/dateUtils';
import { getStageProgress, STAGE_PROGRESS_MAP } from '@/lib/stageProgress';
import { PIPELINE_STAGES } from '@/types';
import { teamService } from '@/services/team';
import { getAllowedStatusesForStage, getDefaultStatusForStage, getStatusLabel, isValidStageStatus, type ProjectStatus } from '@/lib/stageStatusRules';
import { generateSingleProjectReport } from '@/lib/reportGenerator';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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

  // Fetch team members for displaying project lead and team
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
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
        products: Array.isArray(data.products)
          ? data.products.filter(Boolean).map((v: any) => String(v))
          : (data.product ? [String(data.product)] : []),
        subproducts: Array.isArray(data.subproducts)
          ? data.subproducts.filter(Boolean).map((v: any) => String(v))
          : (Array.isArray(data.sub_products)
              ? data.sub_products.filter(Boolean).map((v: any) => String(v))
              : ((data.sub_product ?? data.subProduct) ? [String(data.sub_product ?? data.subProduct)] : [])),
        channelPartner: data.channel_partner || data.channelPartner,
        contractValueNGN: parseFloat(data.contractValueNGN ?? data.contract_value_ngn) || 0,
        contractValueUSD: parseFloat(data.contractValueUSD ?? data.contract_value_usd) || 0,
        marginPercentNGN: parseFloat(data.marginPercentNGN ?? data.margin_percent_ngn) || 0,
        marginPercentUSD: parseFloat(data.marginPercentUSD ?? data.margin_percent_usd) || 0,
        marginValueNGN: parseFloat(data.marginValueNGN ?? data.margin_value_ngn) || 
          (parseFloat(data.contractValueNGN ?? data.contract_value_ngn) && parseFloat(data.marginPercentNGN ?? data.margin_percent_ngn) 
            ? (parseFloat(data.contractValueNGN ?? data.contract_value_ngn) * parseFloat(data.marginPercentNGN ?? data.margin_percent_ngn) / 100) 
            : 0),
        marginValueUSD: parseFloat(data.marginValueUSD ?? data.margin_value_usd) || 
          (parseFloat(data.contractValueUSD ?? data.contract_value_usd) && parseFloat(data.marginPercentUSD ?? data.margin_percent_usd) 
            ? (parseFloat(data.contractValueUSD ?? data.contract_value_usd) * parseFloat(data.marginPercentUSD ?? data.margin_percent_usd) / 100) 
            : 0),
        projectLeadId: data.project_lead_id || data.projectLeadId,
        assigneeId: data.assignee_id || data.assigneeId,
        salesLead: data.sales_lead || data.salesLead,
        projectLeadComments: data.project_lead_comments || data.projectLeadComments,
        supportNeeded: data.support_needed || data.supportNeeded,
        dealProbability: data.deal_probability || data.dealProbability || data.risk_level || data.riskLevel,
        tasks: data.tasks || [],
        projectImage: data.project_image || data.projectImage || undefined,
        milestones: data.milestones || [],
        documents: data.documents || [],
        stageHistory: data.stage_history || data.stageHistory || [],
        teamMemberIds: (data.team_member_ids || data.teamMemberIds || []).map((id: any) => String(id)),
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

  const statusColors: Record<string, string> = {
    active: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    'on-hold': 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    completed: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
    inactive: 'bg-muted text-muted-foreground border-border',
  };

  // Use tasks from API or fallback to project.tasks
  const tasks = projectTasks.length > 0 ? projectTasks : (project.tasks || []);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const handleTaskCreated = () => {
    refetchTasks();
    fetchProject();
    queryClient.invalidateQueries({ queryKey: ['projects'] });
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

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!id || !project) return;
    
    // Validate against pipeline stage
    if (project.pipelineStage && !isValidStageStatus(project.pipelineStage, newStatus)) {
      const allowed = getAllowedStatusesForStage(project.pipelineStage).map(getStatusLabel).join(', ');
      toast.error(`Cannot set "${getStatusLabel(newStatus)}" for stage "${project.pipelineStage}". Allowed: ${allowed}`);
      return;
    }
    
    try {
      await projectsService.update(id, { status: newStatus });
      setProject({ ...project, status: newStatus });
      toast.success(`Project status updated to ${getStatusLabel(newStatus)}`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (err: any) {
      console.error('Failed to update project status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 self-start">
          <ArrowLeft className="w-5 h-5" />
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const tMap: Record<string, string> = {};
                teamMembers.forEach((m: any) => { tMap[String(m.id)] = m.name; });
                await generateSingleProjectReport(project, tMap);
                toast.success('Project report generated');
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Report
            </Button>
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
              {(() => {
                const allowed = project.pipelineStage 
                  ? getAllowedStatusesForStage(project.pipelineStage) 
                  : (['active', 'on-hold', 'completed', 'inactive'] as ProjectStatus[]);
                const statusIcons: Record<string, React.ReactNode> = {
                  active: <PlayCircle className="w-4 h-4 mr-2" />,
                  'on-hold': <PauseCircle className="w-4 h-4 mr-2" />,
                  completed: <CheckCircle2 className="w-4 h-4 mr-2" />,
                  inactive: <PauseCircle className="w-4 h-4 mr-2" />,
                };
                return allowed
                  .filter(s => s !== project.status)
                  .map(status => (
                    <DropdownMenuItem key={status} onClick={() => handleStatusChange(status)}>
                      {statusIcons[status]}
                      {getStatusLabel(status)}
                    </DropdownMenuItem>
                  ));
              })()}
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
          </div>
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
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm sm:text-base">About this project</CardTitle>
                {project.projectImage && (
                  <img
                    src={project.projectImage}
                    alt={project.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain border border-border shrink-0"
                  />
                )}
              </div>
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
                {(project.products && project.products.length > 0) ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.products.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                ) : project.product && (
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="font-medium text-sm">{project.product}</p>
                  </div>
                )}
                {(project.subproducts && project.subproducts.length > 0) ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Sub Product</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.subproducts.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                ) : project.subProduct && (
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
                {project.salesLead && (
                  <div>
                    <p className="text-xs text-muted-foreground">Sales Lead</p>
                    <p className="font-medium text-sm">{project.salesLead}</p>
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
                {/* Margin: show both percent and value for NGN and USD, compute percent if missing */}
                {(project.marginPercentNGN !== undefined || project.marginValueNGN !== undefined) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Margin % (NGN)</p>
                    <p className="font-medium text-sm">
                      {typeof project.marginPercentNGN === 'number' && project.marginPercentNGN > 0
                        ? `${project.marginPercentNGN}%`
                        : (project.marginValueNGN && project.contractValueNGN
                            ? `${((project.marginValueNGN / project.contractValueNGN) * 100).toFixed(2)}%`
                            : '0%')}
                    </p>
                    {project.marginValueNGN !== undefined && project.marginValueNGN > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Margin Value (NGN)</p>
                    )}
                    {project.marginValueNGN !== undefined && project.marginValueNGN > 0 && (
                      <p className="font-medium text-sm">₦{Number(project.marginValueNGN).toLocaleString()}</p>
                    )}
                  </div>
                )}

                {(project.marginPercentUSD !== undefined || project.marginValueUSD !== undefined) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Margin % (USD)</p>
                    <p className="font-medium text-sm">
                      {typeof project.marginPercentUSD === 'number' && project.marginPercentUSD > 0
                        ? `${project.marginPercentUSD}%`
                        : (project.marginValueUSD && project.contractValueUSD
                            ? `${((project.marginValueUSD / project.contractValueUSD) * 100).toFixed(2)}%`
                            : '0%')}
                    </p>
                    {project.marginValueUSD !== undefined && project.marginValueUSD > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Margin Value (USD)</p>
                    )}
                    {project.marginValueUSD !== undefined && project.marginValueUSD > 0 && (
                      <p className="font-medium text-sm">${Number(project.marginValueUSD).toLocaleString()}</p>
                    )}
                  </div>
                )}
                {project.dealProbability && (
                  <div>
                    <p className="text-xs text-muted-foreground">Deal Probability</p>
                    <Badge variant="outline" className="capitalize">{project.dealProbability}</Badge>
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
              {project.supportNeeded && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Support Needed</p>
                  <p className="text-sm">{project.supportNeeded}</p>
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
                onTaskEdit={(task) => setEditingTask(task)}
              />
            </TabsContent>
            <TabsContent value="list" className="mt-0">
              <TaskList 
                tasks={tasks}
                onTaskDelete={handleTaskDelete}
                onTaskEdit={(task) => setEditingTask(task)}
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

          {/* Edit Task Dialog */}
          <EditTaskDialog
            open={!!editingTask}
            onOpenChange={(open) => { if (!open) setEditingTask(null); }}
            task={editingTask}
            onTaskUpdated={handleTaskCreated}
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
                  <span className="font-medium">{getStageProgress(project.pipelineStage, project.progress)}%</span>
                </div>
                <Progress value={getStageProgress(project.pipelineStage, project.progress)} className="h-3" />
                {project.pipelineStage && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Stage: {PIPELINE_STAGES.find(s => s.value === project.pipelineStage)?.label || project.pipelineStage}
                  </p>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks completed</span>
                  <span className="font-medium">{completedTasks}/{tasks.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Card */}
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const lead = teamMembers.find((m: any) => m.id === project.projectLeadId || String(m.id) === String(project.projectLeadId));
                const assignee = project.assigneeId
                  ? teamMembers.find((m: any) => m.id === project.assigneeId || String(m.id) === String(project.assigneeId))
                  : null;
                
                // Get team members excluding lead and assignee
                const leadId = project.projectLeadId ? String(project.projectLeadId) : null;
                const assigneeIdStr = project.assigneeId ? String(project.assigneeId) : null;
                const otherMembers = (project.teamMemberIds || [])
                  .filter(id => id !== leadId && id !== assigneeIdStr)
                  .map(id => teamMembers.find((m: any) => String(m.id) === id))
                  .filter(Boolean);

                return (
                  <>
                    {lead ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {lead.name?.charAt(0)?.toUpperCase() || 'L'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">Project Lead</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No project lead assigned</p>
                    )}
                    {assignee ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-chart-2/10 flex items-center justify-center text-xs font-semibold text-chart-2">
                          {assignee.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{assignee.name}</p>
                          <p className="text-xs text-muted-foreground">Assignee</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No assignee assigned</p>
                    )}

                    {/* Other Team Members */}
                    {otherMembers.length > 0 && (
                      <div className="pt-2 border-t border-border space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Members</p>
                        <div className="flex flex-wrap gap-2">
                          {otherMembers.map((member: any) => (
                            <div key={member.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px] font-semibold text-accent-foreground">
                                {member.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="text-xs font-medium">{member.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border">
                      {(() => {
                        const dynamicSize = new Set([
                          leadId,
                          assigneeIdStr,
                          ...otherMembers.map((m: any) => String(m.id)),
                        ].filter(Boolean)).size;
                        const displaySize = dynamicSize || project.teamSize || 0;
                        return (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Team Size:</span>
                            <span className="font-medium">{displaySize}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                );
              })()}
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
