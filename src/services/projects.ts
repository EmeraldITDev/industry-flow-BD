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
// API may return camelCase OR snake_case format - handle both
const normalizeProject = (project: any): Project => {
  // Helper to get numeric value from either camelCase or snake_case field.
  // Strips formatting (commas, currency symbols, whitespace) before parsing to handle API strings like "₦1,500,000".
  const getValue = (camelKey: string, snakeKey: string): number => {
    let value = project[camelKey] ?? project[snakeKey];
    if (value == null) return 0;

    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]+/g, '');
      if (cleaned !== value) {
        console.log(`[Projects Service] Cleaned numeric string for ${camelKey}/${snakeKey}:`, { raw: value, cleaned });
      }
      return parseFloat(cleaned) || 0;
    }

    if (typeof value === 'number') return value;

    // If it's another type (e.g., object), return 0
    return 0;
  };

  // Get financial values from either format
  const contractValueNGN = getValue('contractValueNGN', 'contract_value_ngn');
  const contractValueUSD = getValue('contractValueUSD', 'contract_value_usd');
  const marginPercentNGN = getValue('marginPercentNGN', 'margin_percent_ngn');
  const marginPercentUSD = getValue('marginPercentUSD', 'margin_percent_usd');
  
  // Calculate margin values - use provided value or calculate from percent
  let marginValueNGN = getValue('marginValueNGN', 'margin_value_ngn');
  let marginValueUSD = getValue('marginValueUSD', 'margin_value_usd');
  
  // If margin values are 0 but we have contract and percent, calculate them
  if (marginValueNGN === 0 && contractValueNGN > 0 && marginPercentNGN > 0) {
    marginValueNGN = (contractValueNGN * marginPercentNGN) / 100;
  }
  if (marginValueUSD === 0 && contractValueUSD > 0 && marginPercentUSD > 0) {
    marginValueUSD = (contractValueUSD * marginPercentUSD) / 100;
  }

  // If margin percent is missing but we have margin value and contract value, compute percent
  if ((marginPercentNGN === 0 || marginPercentNGN == null) && marginValueNGN > 0 && contractValueNGN > 0) {
    marginPercentNGN = parseFloat(((marginValueNGN / contractValueNGN) * 100).toFixed(2));
  }
  if ((marginPercentUSD === 0 || marginPercentUSD == null) && marginValueUSD > 0 && contractValueUSD > 0) {
    marginPercentUSD = parseFloat(((marginValueUSD / contractValueUSD) * 100).toFixed(2));
  }

  // Debug logging for projects with any financial data
  const hasAnyFinancialData = contractValueNGN > 0 || contractValueUSD > 0 || 
                              marginValueNGN > 0 || marginValueUSD > 0 ||
                              marginPercentNGN > 0 || marginPercentUSD > 0;
  
  if (project.id && hasAnyFinancialData) {
    console.log('[Projects Service] Normalized project with financial data:', {
      projectId: project.id,
      projectName: project.name,
      contractValueNGN,
      contractValueUSD,
      marginValueNGN,
      marginValueUSD,
      marginPercentNGN,
      marginPercentUSD,
    });
  }

  // Normalize other fields that may also be snake_case
  return {
    ...project,
    // Ensure financial fields are always present as numbers
    contractValueNGN,
    contractValueUSD,
    marginPercentNGN,
    marginPercentUSD,
    marginValueNGN,
    marginValueUSD,
    // Normalize other common snake_case fields
    clientName: project.clientName ?? project.client_name ?? '',
    clientContact: project.clientContact ?? project.client_contact ?? '',
    startDate: project.startDate ?? project.start_date ?? '',
    endDate: project.endDate ?? project.end_date ?? '',
    pipelineStage: project.pipelineStage ?? project.pipeline_stage ?? 'initiation',
    pipelineIntakeDate: project.pipelineIntakeDate ?? project.pipeline_intake_date ?? null,
    expectedCloseDate: project.expectedCloseDate ?? project.expected_close_date ?? null,
    businessSegment: project.businessSegment ?? project.business_segment ?? '',
    subProduct: project.subProduct ?? project.sub_product ?? '',
    projectLeadId: project.projectLeadId ?? project.project_lead_id ?? null,
    assigneeId: project.assigneeId ?? project.assignee_id ?? null,
    channelPartner: project.channelPartner ?? project.channel_partner ?? '',
    projectLeadComments: project.projectLeadComments ?? project.project_lead_comments ?? '',
    dealProbability: project.dealProbability ?? project.deal_probability ?? project.riskLevel ?? project.risk_level ?? 'low',
  };
};

export const projectsService = {
  // Get all projects
  getAll: async (filters?: ProjectFilters): Promise<Project[]> => {
    try {
      const response = await api.get('/api/projects', { params: filters });
      // Robustly unwrap arrays that might be nested inside "data" wrappers
      const data = response.data;

      let projects: any[] = [];

      if (Array.isArray(data)) {
        projects = data;
      } else if (Array.isArray(data?.data)) {
        projects = data.data;
      } else if (Array.isArray(data?.data?.data)) {
        projects = data.data.data;
        console.warn('[Projects Service] Detected double-wrapped projects array (data.data.data)');
      } else if (Array.isArray(data?.projects)) {
        projects = data.projects;
      } else if (Array.isArray(data?.results)) {
        projects = data.results;
      } else {
        // Try to find any array value on the response object
        for (const key of Object.keys(data || {})) {
          if (Array.isArray((data as any)[key])) {
            projects = (data as any)[key];
            console.warn(`[Projects Service] Found projects array under key '${key}'`);
            break;
          }
        }
      }

      // Debug: Log raw project data to see what API returns
      if (projects.length > 0) {
        console.log('[Projects Service] Raw project data sample:', {
          firstProject: projects[0],
          hasContractValueNGN: 'contractValueNGN' in projects[0],
          hasContractValueUSD: 'contractValueUSD' in projects[0],
          contractValueNGN: projects[0].contractValueNGN,
          contractValueUSD: projects[0].contractValueUSD,
        });
      } else {
        console.warn('[Projects Service] No projects returned from API (projects array is empty)');
        console.debug('[Projects Service] API raw response:', data);
      }

      // Safely normalize projects: skip items that throw during normalization
      const normalized: Project[] = [];
      const skipped: any[] = [];

      for (let i = 0; i < projects.length; i++) {
        try {
          const p = normalizeProject(projects[i]);
          normalized.push(p);
        } catch (err: any) {
          console.error('[Projects Service] Failed to normalize project at index', i, { item: projects[i], error: err });
          skipped.push({ index: i, item: projects[i], error: err?.message ?? String(err) });
          // continue with next item
        }
      }

      if (skipped.length > 0) {
        console.warn('[Projects Service] Some projects were skipped during normalization:', skipped.length, skipped.slice(0, 3));
      }

      // Debug: Log normalized projects
      const projectsWithFinancialData = normalized.filter(p => (p.contractValueNGN || 0) > 0 || (p.contractValueUSD || 0) > 0);
      if (projectsWithFinancialData.length > 0) {
        console.log('[Projects Service] Projects with financial data:', projectsWithFinancialData.length, projectsWithFinancialData);
      } else {
        console.warn('[Projects Service] No projects found with financial data');
      }

      return normalized;
    } catch (err: any) {
      console.error('[Projects Service] Error fetching projects:', err);
      // Re-throw a clearer error for the UI
      throw new Error(`Failed to fetch projects: ${err?.message || String(err)}`);
    }
  },

  // Get single project by ID
  getById: async (id: string): Promise<Project> => {
    const response = await api.get(`/api/projects/${id}`);
    // Some APIs wrap the project as { data: project } - unwrap if present
    const raw = response.data?.data ?? response.data;
    return normalizeProject(raw);
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
    // Build request: keep contract/margin fields explicit (no filtering) so backend can overwrite previous values
    const requestData = { ...data };
    
    // Explicitly include financial fields even if undefined (backend should treat as null/clear)
    const financialKeys = ['contractValueNGN', 'contractValueUSD', 'marginPercentNGN', 'marginPercentUSD', 'marginValueNGN', 'marginValueUSD'];
    
    // Remove undefined from non-financial fields, but keep financials explicit
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === undefined && !financialKeys.includes(key)) {
        delete requestData[key];
      }
    });

    // Ensure financial fields are present (as null or number) so backend overwrites
    financialKeys.forEach(key => {
      if (!(key in requestData)) {
        requestData[key] = null;
      }
    });
    
    // Log full payload being sent for debugging
    console.log('[Projects Service] Update request payload:', {
      projectId: id,
      ...requestData,
    });
    
    const response = await api.put(`/api/projects/${id}`, requestData);
    return normalizeProject(response.data?.data ?? response.data);
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
