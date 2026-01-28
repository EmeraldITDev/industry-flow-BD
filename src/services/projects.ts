import api from './api';
import { Project, PipelineStage, Sector, BusinessSegment, RiskLevel, ProjectStats } from '@/types';

export interface CreateProjectData {
  name: string;
  description: string;
  sector: Sector;
  status?: 'active' | 'on-hold' | 'completed';
  startDate: string;
  endDate?: string;
  budget?: number;
  clientName?: string;
  clientContact?: string;
  pipelineStage?: PipelineStage;
  pipelineIntakeDate?: string;
  oem?: string;
  location?: string;
  expectedCloseDate?: string;
  businessSegment?: BusinessSegment;
  product?: string;
  subProduct?: string;
  projectLeadId?: string;
  assigneeId?: string;
  channelPartner?: string;
  contractValueNGN?: number;
  contractValueUSD?: number;
  marginPercentNGN?: number;
  marginPercentUSD?: number;
  marginValueNGN?: number;
  marginValueUSD?: number;
  projectLeadComments?: string;
  dealProbability?: RiskLevel;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  progress?: number;
  spentBudget?: number;
  dealProbability?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProjectFilters {
  search?: string;
  sector?: Sector;
  status?: string;
  pipelineStage?: PipelineStage;
  businessSegment?: BusinessSegment;
  projectLeadId?: string;
  assigneeId?: string;
}

// Normalize project data from backend
// API returns camelCase format
const normalizeProject = (project: any): Project => {
  // API returns camelCase - use directly
  // Handle both number and string values (forms might send strings)
  const contractValueNGN = project.contractValueNGN != null 
    ? (typeof project.contractValueNGN === 'string' ? parseFloat(project.contractValueNGN) || 0 : project.contractValueNGN)
    : 0;
  const contractValueUSD = project.contractValueUSD != null
    ? (typeof project.contractValueUSD === 'string' ? parseFloat(project.contractValueUSD) || 0 : project.contractValueUSD)
    : 0;
  const marginPercentNGN = project.marginPercentNGN != null
    ? (typeof project.marginPercentNGN === 'string' ? parseFloat(project.marginPercentNGN) || 0 : project.marginPercentNGN)
    : 0;
  const marginPercentUSD = project.marginPercentUSD != null
    ? (typeof project.marginPercentUSD === 'string' ? parseFloat(project.marginPercentUSD) || 0 : project.marginPercentUSD)
    : 0;
  
  // Calculate margin values if not provided
  const marginValueNGN = project.marginValueNGN != null
    ? (typeof project.marginValueNGN === 'string' ? parseFloat(project.marginValueNGN) || 0 : project.marginValueNGN)
    : (contractValueNGN && marginPercentNGN ? (contractValueNGN * marginPercentNGN / 100) : 0);
  const marginValueUSD = project.marginValueUSD != null
    ? (typeof project.marginValueUSD === 'string' ? parseFloat(project.marginValueUSD) || 0 : project.marginValueUSD)
    : (contractValueUSD && marginPercentUSD ? (contractValueUSD * marginPercentUSD / 100) : 0);

  // Debug logging for all projects to understand data structure
  if (project.id) {
    const hasAnyFinancialData = contractValueNGN > 0 || contractValueUSD > 0 || 
                                marginValueNGN > 0 || marginValueUSD > 0 ||
                                marginPercentNGN > 0 || marginPercentUSD > 0;
    
    if (hasAnyFinancialData) {
      console.log('[Projects Service] Normalized project with financial data:', {
        projectId: project.id,
        projectName: project.name,
        contractValueNGN,
        contractValueUSD,
        marginValueNGN,
        marginValueUSD,
        marginPercentNGN,
        marginPercentUSD,
        rawContractValueNGN: project.contractValueNGN,
        rawContractValueUSD: project.contractValueUSD,
      });
    } else {
      // Log projects without financial data to understand why
      console.log('[Projects Service] Project without financial data:', {
        projectId: project.id,
        projectName: project.name,
        hasContractValueNGN: 'contractValueNGN' in project,
        hasContractValueUSD: 'contractValueUSD' in project,
        rawContractValueNGN: project.contractValueNGN,
        rawContractValueUSD: project.contractValueUSD,
        rawMarginValueNGN: project.marginValueNGN,
        rawMarginValueUSD: project.marginValueUSD,
      });
    }
  }

  return {
    ...project,
    contractValueNGN,
    contractValueUSD,
    marginPercentNGN,
    marginPercentUSD,
    marginValueNGN,
    marginValueUSD,
  };
};

export const projectsService = {
  // Get all projects
  getAll: async (filters?: ProjectFilters): Promise<Project[]> => {
    const response = await api.get('/api/projects', { params: filters });
    // Handle both direct array response and wrapped { data: [...] } response
    const data = response.data;
    const projects = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    
    // Debug: Log raw project data to see what API returns
    if (projects.length > 0) {
      console.log('[Projects Service] Raw project data sample:', {
        firstProject: projects[0],
        hasContractValueNGN: 'contractValueNGN' in projects[0],
        hasContractValueUSD: 'contractValueUSD' in projects[0],
        contractValueNGN: projects[0].contractValueNGN,
        contractValueUSD: projects[0].contractValueUSD,
      });
    }
    
    // Normalize all projects to ensure consistent field names
    const normalized = projects.map(normalizeProject);
    
    // Debug: Log normalized projects
    const projectsWithFinancialData = normalized.filter(p => (p.contractValueNGN || 0) > 0 || (p.contractValueUSD || 0) > 0);
    if (projectsWithFinancialData.length > 0) {
      console.log('[Projects Service] Projects with financial data:', projectsWithFinancialData.length, projectsWithFinancialData);
    } else {
      console.warn('[Projects Service] No projects found with financial data');
    }
    
    return normalized;
  },

  // Get single project by ID
  getById: async (id: string): Promise<Project> => {
    const response = await api.get(`/api/projects/${id}`);
    return normalizeProject(response.data);
  },

  // Create new project
  create: async (data: CreateProjectData): Promise<Project> => {
    // API expects camelCase format - send data as-is
    const requestData = { ...data };
    
    // Remove undefined values
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === undefined) {
        delete requestData[key];
      }
    });
    
    // Log financial data being sent (for debugging)
    console.log('[Projects Service] Creating project with financial data (camelCase):', {
      contractValueNGN: requestData.contractValueNGN,
      contractValueUSD: requestData.contractValueUSD,
      marginPercentNGN: requestData.marginPercentNGN,
      marginPercentUSD: requestData.marginPercentUSD,
      marginValueNGN: requestData.marginValueNGN,
      marginValueUSD: requestData.marginValueUSD,
    });
    
    const response = await api.post('/api/projects', requestData);
    return normalizeProject(response.data);
  },

  // Update project
  update: async (id: string, data: UpdateProjectData): Promise<Project> => {
    // API expects camelCase format - send data as-is
    const requestData = { ...data };
    
    // Remove undefined values
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === undefined) {
        delete requestData[key];
      }
    });
    
    // Log financial data being sent (for debugging)
    if (requestData.contractValueNGN || requestData.contractValueUSD || 
        requestData.marginValueNGN || requestData.marginValueUSD) {
      console.log('[Projects Service] Updating project with financial data (camelCase):', {
        contractValueNGN: requestData.contractValueNGN,
        contractValueUSD: requestData.contractValueUSD,
        marginPercentNGN: requestData.marginPercentNGN,
        marginPercentUSD: requestData.marginPercentUSD,
        marginValueNGN: requestData.marginValueNGN,
        marginValueUSD: requestData.marginValueUSD,
      });
    }
    
    const response = await api.put(`/api/projects/${id}`, requestData);
    return normalizeProject(response.data);
  },

  // Delete project
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/projects/${id}`);
  },

  // Update pipeline stage
  updateStage: async (id: string, stage: PipelineStage): Promise<Project> => {
    const response = await api.patch(`/api/projects/${id}/stage`, { pipelineStage: stage });
    return response.data;
  },

  // Get project statistics/dashboard data - USE API ONLY, NO MOCK DATA
  getStats: async (): Promise<ProjectStats> => {
    try {
      const response = await api.get('/api/projects/stats');
      console.log('[Projects Service] Stats API Response (raw):', response.data);
      
      // Handle different response structures: { data: {...} }, { total: {...} }, or direct stats object
      let data = response.data;
      
      // If response has a 'data' property, use it
      if (data?.data && typeof data.data === 'object') {
        data = data.data;
      }
      
      // Validate we have a valid stats object
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid stats response format');
      }
      
      // Normalize field names - API returns camelCase
      const normalized: ProjectStats = {
        total: data?.total ?? data?.totalProjects ?? 0,
        totalProjects: data?.totalProjects ?? data?.total ?? 0,
        active: data?.active ?? data?.activeProjects ?? 0,
        activeProjects: data?.activeProjects ?? data?.active ?? 0,
        completed: data?.completed ?? data?.completedProjects ?? 0,
        completedProjects: data?.completedProjects ?? data?.completed ?? 0,
        highRisk: data?.highRisk ?? 0,
        completedTasks: data?.completedTasks ?? 0,
        pendingTasks: data?.pendingTasks ?? 0,
        overdueTasks: data?.overdueTasks ?? 0,
        totalValueNgn: data?.totalValueNgn ?? 0,
        totalValueUsd: data?.totalValueUsd ?? 0,
        averageProgress: data?.averageProgress ?? 0,
        byStatus: data?.byStatus ?? {
          active: 0,
          on_hold: 0,
          completed: 0,
          cancelled: 0,
        },
        byStage: data?.byStage ?? {},
        byAssignee: data?.byAssignee ?? [],
        recent: Array.isArray(data?.recent) ? data.recent : [],
      };
      
      console.log('[Projects Service] Normalized Stats (from API):', normalized);
      console.log('[Projects Service] Stats validation:', {
        hasTotal: normalized.total > 0 || normalized.totalProjects > 0,
        hasFinancial: normalized.totalValueNgn > 0 || normalized.totalValueUsd > 0,
        hasTasks: normalized.completedTasks > 0 || normalized.pendingTasks > 0,
      });
      
      return normalized;
    } catch (error: any) {
      console.error('[Projects Service] Error fetching stats:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  },
};
