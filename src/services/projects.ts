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
  projectLeadComments?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  progress?: number;
  spentBudget?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
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

export const projectsService = {
  // Get all projects
  getAll: async (filters?: ProjectFilters): Promise<Project[]> => {
    const response = await api.get('/api/projects', { params: filters });
    // Handle both direct array response and wrapped { data: [...] } response
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  // Get single project by ID
  getById: async (id: string): Promise<Project> => {
    const response = await api.get(`/api/projects/${id}`);
    return response.data;
  },

  // Create new project
  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await api.post('/api/projects', data);
    return response.data;
  },

  // Update project
  update: async (id: string, data: UpdateProjectData): Promise<Project> => {
    const response = await api.put(`/api/projects/${id}`, data);
    return response.data;
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
