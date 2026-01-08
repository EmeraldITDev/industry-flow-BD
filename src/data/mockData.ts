import { Project, Task, Sector, TeamMember, PipelineStage, BusinessSegment, ProjectDocument } from '@/types';

export const sectors: Sector[] = ['Manufacturing', 'Energy', 'Oil and Gas', 'Commodity Trading'];

export const businessSegments: BusinessSegment[] = ['Industrial', 'Commercial', 'Government', 'Enterprise', 'SMB'];

export const sectorColors: Record<Sector, string> = {
  Manufacturing: 'bg-chart-1/20 text-chart-1',
  Energy: 'bg-chart-2/20 text-chart-2',
  'Oil and Gas': 'bg-chart-3/20 text-chart-3',
  'Commodity Trading': 'bg-chart-4/20 text-chart-4',
};

export const sectorIcons: Record<Sector, string> = {
  Manufacturing: '🏭',
  Energy: '⚡',
  'Oil and Gas': '🛢️',
  'Commodity Trading': '📈',
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
