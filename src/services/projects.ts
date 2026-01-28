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

// Normalize project data from backend (handle both snake_case and camelCase)
const normalizeProject = (project: any): Project => {
  // Extract financial values from both snake_case and camelCase
  const contractValueNGN = project.contract_value_ngn ?? project.contractValueNGN ?? 0;
  const contractValueUSD = project.contract_value_usd ?? project.contractValueUSD ?? 0;
  const marginPercentNGN = project.margin_percent_ngn ?? project.marginPercentNGN ?? 0;
  const marginPercentUSD = project.margin_percent_usd ?? project.marginPercentUSD ?? 0;
  
  // Calculate margin values if not provided
  const marginValueNGN = project.margin_value_ngn ?? project.marginValueNGN ?? 
    (contractValueNGN && marginPercentNGN ? (contractValueNGN * marginPercentNGN / 100) : 0);
  const marginValueUSD = project.margin_value_usd ?? project.marginValueUSD ?? 
    (contractValueUSD && marginPercentUSD ? (contractValueUSD * marginPercentUSD / 100) : 0);

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

// Transform camelCase financial fields to snake_case for backend API
// Backend expects snake_case format
const transformToBackendFormat = (data: any): any => {
  const transformed: any = { ...data };
  
  // Map financial fields from camelCase to snake_case
  if (data.contractValueNGN !== undefined) {
    transformed.contract_value_ngn = data.contractValueNGN;
    delete transformed.contractValueNGN;
  }
  if (data.contractValueUSD !== undefined) {
    transformed.contract_value_usd = data.contractValueUSD;
    delete transformed.contractValueUSD;
  }
  if (data.marginPercentNGN !== undefined) {
    transformed.margin_percent_ngn = data.marginPercentNGN;
    delete transformed.marginPercentNGN;
  }
  if (data.marginPercentUSD !== undefined) {
    transformed.margin_percent_usd = data.marginPercentUSD;
    delete transformed.marginPercentUSD;
  }
  if (data.marginValueNGN !== undefined) {
    transformed.margin_value_ngn = data.marginValueNGN;
    delete transformed.marginValueNGN;
  }
  if (data.marginValueUSD !== undefined) {
    transformed.margin_value_usd = data.marginValueUSD;
    delete transformed.marginValueUSD;
  }
  
  return transformed;
};

export const projectsService = {
  // Get all projects
  getAll: async (filters?: ProjectFilters): Promise<Project[]> => {
    const response = await api.get('/api/projects', { params: filters });
    // Handle both direct array response and wrapped { data: [...] } response
    const data = response.data;
    const projects = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    // Normalize all projects to ensure consistent field names
    return projects.map(normalizeProject);
  },

  // Get single project by ID
  getById: async (id: string): Promise<Project> => {
    const response = await api.get(`/api/projects/${id}`);
    return normalizeProject(response.data);
  },

  // Create new project
  create: async (data: CreateProjectData): Promise<Project> => {
    // Transform financial fields to snake_case for backend
    const backendData = transformToBackendFormat(data);
    // Remove undefined values
    Object.keys(backendData).forEach(key => {
      if (backendData[key] === undefined) {
        delete backendData[key];
      }
    });
    
    // Log financial data being sent (for debugging)
    console.log('[Projects Service] Creating project with financial data:', {
      contract_value_ngn: backendData.contract_value_ngn,
      contract_value_usd: backendData.contract_value_usd,
      margin_percent_ngn: backendData.margin_percent_ngn,
      margin_percent_usd: backendData.margin_percent_usd,
      margin_value_ngn: backendData.margin_value_ngn,
      margin_value_usd: backendData.margin_value_usd,
    });
    
    const response = await api.post('/api/projects', backendData);
    return normalizeProject(response.data);
  },

  // Update project
  update: async (id: string, data: UpdateProjectData): Promise<Project> => {
    // Transform financial fields to snake_case for backend
    const backendData = transformToBackendFormat(data);
    // Remove undefined values
    Object.keys(backendData).forEach(key => {
      if (backendData[key] === undefined) {
        delete backendData[key];
      }
    });
    
    // Log financial data being sent (for debugging)
    if (backendData.contract_value_ngn || backendData.contract_value_usd || 
        backendData.margin_value_ngn || backendData.margin_value_usd) {
      console.log('[Projects Service] Updating project with financial data:', {
        contract_value_ngn: backendData.contract_value_ngn,
        contract_value_usd: backendData.contract_value_usd,
        margin_percent_ngn: backendData.margin_percent_ngn,
        margin_percent_usd: backendData.margin_percent_usd,
        margin_value_ngn: backendData.margin_value_ngn,
        margin_value_usd: backendData.margin_value_usd,
      });
    }
    
    const response = await api.put(`/api/projects/${id}`, backendData);
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

  // Get project statistics/dashboard data
  getStats: async (): Promise<ProjectStats> => {
    try {
      const response = await api.get('/api/projects/stats');
      console.log('[Projects Service] Stats API Response:', response.data);
      
      // Handle different response structures: { data: {...} }, { total: {...} }, or direct stats object
      let data = response.data;
      
      // If response has a 'data' property, use it
      if (data?.data) {
        data = data.data;
      }
      
      // Normalize field names (handle both camelCase and snake_case)
      const normalized: ProjectStats = {
        total: data?.total ?? data?.totalProjects ?? 0,
        totalProjects: data?.totalProjects ?? data?.total ?? 0,
        active: data?.active ?? data?.activeProjects ?? 0,
        activeProjects: data?.activeProjects ?? data?.active ?? 0,
        completed: data?.completed ?? data?.completedProjects ?? 0,
        completedProjects: data?.completedProjects ?? data?.completed ?? 0,
        highRisk: data?.highRisk ?? data?.high_risk ?? 0,
        completedTasks: data?.completedTasks ?? data?.completed_tasks ?? 0,
        pendingTasks: data?.pendingTasks ?? data?.pending_tasks ?? 0,
        overdueTasks: data?.overdueTasks ?? data?.overdue_tasks ?? 0,
        totalValueNgn: data?.totalValueNgn ?? data?.total_value_ngn ?? 0,
        totalValueUsd: data?.totalValueUsd ?? data?.total_value_usd ?? 0,
        averageProgress: data?.averageProgress ?? data?.average_progress ?? 0,
        byStatus: data?.byStatus ?? data?.by_status ?? {
          active: 0,
          on_hold: 0,
          completed: 0,
          cancelled: 0,
        },
        byStage: data?.byStage ?? data?.by_stage ?? {},
        byAssignee: data?.byAssignee ?? data?.by_assignee ?? [],
        recent: data?.recent ?? [],
      };
      
      console.log('[Projects Service] Normalized Stats:', normalized);
      return normalized;
    } catch (error) {
      console.error('[Projects Service] Error fetching stats:', error);
      throw error;
    }
  },
};
