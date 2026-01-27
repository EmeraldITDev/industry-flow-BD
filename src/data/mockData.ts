import { Project, Task, Sector, TeamMember, PipelineStage, BusinessSegment, ProjectDocument } from '@/types';

export const sectors: Sector[] = ['EMR_OGP', 'EMR_MFG', 'EMR_Services', 'BEDS_Services', 'EMR_Healthcare', 'EMR_Renewables', 'EMR_Trading'];

export const businessSegments: BusinessSegment[] = ['EMR_MFG', 'EMR_OGP', 'EMR_Renewables', 'EMR_Services', 'BEDS_Services', 'EMR_Healthcare', 'EMR_Trading'];

export const sectorColors: Record<Sector, string> = {
  EMR_OGP: 'bg-chart-1/20 text-chart-1',
  EMR_MFG: 'bg-chart-2/20 text-chart-2',
  EMR_Services: 'bg-chart-3/20 text-chart-3',
  BEDS_Services: 'bg-chart-4/20 text-chart-4',
  EMR_Healthcare: 'bg-chart-5/20 text-chart-5',
  EMR_Renewables: 'bg-chart-1/20 text-chart-1',
  EMR_Trading: 'bg-chart-2/20 text-chart-2',
};

export const sectorIcons: Record<Sector, string> = {
  EMR_OGP: '🛢️',
  EMR_MFG: '🏭',
  EMR_Services: '⚙️',
  BEDS_Services: '💼',
  EMR_Healthcare: '🏥',
  EMR_Renewables: '⚡',
  EMR_Trading: '📈',
};

export const stageColors: Record<PipelineStage, string> = {
  initiation: 'bg-chart-5/20 text-chart-5',
  qualification: 'bg-chart-4/20 text-chart-4',
  proposal: 'bg-chart-1/20 text-chart-1',
  negotiation: 'bg-chart-3/20 text-chart-3',
  approval: 'bg-chart-2/20 text-chart-2',
  execution: 'bg-primary/20 text-primary',
  closure: 'bg-accent/20 text-accent',
};

// Empty project and team arrays - no dummy data
export const projects: Project[] = [];

export const teamMembers: TeamMember[] = [];

export const getProjectById = (id: string): Project | undefined => {
  return projects.find(p => p.id === id);
};

export const getProjectsBySector = (sector: Sector): Project[] => {
  return projects.filter(p => p.sector === sector);
};

export const getTeamMemberById = (id: string): TeamMember | undefined => {
  return teamMembers.find(m => m.id === id);
};

export const getDashboardStats = () => {
  const allTasks = projects.flatMap(p => p.tasks);
  const now = new Date();
  
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    completedTasks: allTasks.filter(t => t.status === 'completed').length,
    pendingTasks: allTasks.filter(t => t.status !== 'completed').length,
    overdueTasks: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed').length,
  };
};

// Check for projects with inactivity > 3 days
export const getInactiveProjects = (): Project[] => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  return projects.filter(p => 
    p.status === 'active' && 
    p.lastStageUpdate && 
    new Date(p.lastStageUpdate) < threeDaysAgo &&
    p.pipelineStage !== 'closure'
  );
};
