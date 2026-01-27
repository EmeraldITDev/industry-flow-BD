import api from './api';
import { Project, PipelineStage, Sector, BusinessSegment } from '@/types';

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
  return {
    ...project,
    contractValueNGN: project.contract_value_ngn ?? project.contractValueNGN,
    contractValueUSD: project.contract_value_usd ?? project.contractValueUSD,
    marginPercentNGN: project.margin_percent_ngn ?? project.marginPercentNGN,
    marginPercentUSD: project.margin_percent_usd ?? project.marginPercentUSD,
    marginValueNGN: project.margin_value_ngn ?? project.marginValueNGN ?? 
      (project.contract_value_ngn && project.margin_percent_ngn 
        ? (project.contract_value_ngn * project.margin_percent_ngn / 100) 
        : project.contractValueNGN && project.marginPercentNGN 
          ? (project.contractValueNGN * project.marginPercentNGN / 100) 
          : undefined),
    marginValueUSD: project.margin_value_usd ?? project.marginValueUSD ?? 
      (project.contract_value_usd && project.margin_percent_usd 
        ? (project.contract_value_usd * project.margin_percent_usd / 100) 
        : project.contractValueUSD && project.marginPercentUSD 
          ? (project.contractValueUSD * project.marginPercentUSD / 100) 
          : undefined),
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
  getStats: async () => {
    const response = await api.get('/api/projects/stats');
    // Handle different response structures: { data: {...} }, { total: {...} }, or direct stats object
    const data = response.data;
    if (data?.data) return data.data;
    if (data?.total) return data.total;
    return data;
  },
};
