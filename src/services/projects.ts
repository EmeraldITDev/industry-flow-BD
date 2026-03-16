import api from './api';
import { Project, PipelineStage, Sector, BusinessSegment, RiskLevel, ProjectStats } from '@/types';
import { notifyAssignment } from './notificationHelper';
import { getDefaultStatusForStage, isValidStageStatus, type ProjectStatus } from '@/lib/stageStatusRules';

export interface CreateProjectData {
  name: string;
  description: string;
  sector: Sector;
  status?: 'active' | 'on-hold' | 'completed' | 'inactive';
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
  salesLead?: string;
  channelPartner?: string;
  contractValueNGN?: number;
  contractValueUSD?: number;
  marginPercentNGN?: number;
  marginPercentUSD?: number;
  marginValueNGN?: number;
  marginValueUSD?: number;
  projectLeadComments?: string;
  dealProbability?: RiskLevel;
  projectImage?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  progress?: number;
  spentBudget?: number;
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
  const getValue = (camelKey: string, snakeKey: string, debugLabel?: string): number => {
    let value = project[camelKey] ?? project[snakeKey];
    if (value == null) return 0;

    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]+/g, '');
      if (cleaned !== value && cleaned) {
        console.debug(`[Projects Service] Cleaned numeric string for ${camelKey}/${snakeKey}:`, { raw: value, cleaned });
      }
      const parsed = parseFloat(cleaned) || 0;
      return isFinite(parsed) ? parsed : 0;
    }

    if (typeof value === 'number') {
      return isFinite(value) ? value : 0;
    }

    // If it's another type (e.g., object), return 0
    return 0;
  };

  // Get financial values from either format
  const contractValueNGN = getValue('contractValueNGN', 'contract_value_ngn');
  const contractValueUSD = getValue('contractValueUSD', 'contract_value_usd');
  let marginPercentNGN = getValue('marginPercentNGN', 'margin_percent_ngn');
  let marginPercentUSD = getValue('marginPercentUSD', 'margin_percent_usd');
  
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
  const pipelineStage = (project.pipelineStage ?? project.pipeline_stage ?? 'initiation') as PipelineStage;
  let status = (project.status ?? 'active') as ProjectStatus;

  // Auto-correct status based on pipeline stage validation rules
  if (!isValidStageStatus(pipelineStage, status)) {
    const correctedStatus = getDefaultStatusForStage(pipelineStage);
    console.warn(`[Projects Service] Auto-correcting status for project "${project.name}" (id: ${project.id}): "${status}" → "${correctedStatus}" (stage: ${pipelineStage})`);
    status = correctedStatus;
  }

  // Compute teamMemberIds
  const teamMemberIds = (project.teamMemberIds ?? project.team_member_ids ?? []).map((id: any) => String(id));
  
  // Compute teamSize from unique people (lead + assignee + members)
  const projectLeadId = project.projectLeadId ?? project.project_lead_id ?? null;
  const assigneeId = project.assigneeId ?? project.assignee_id ?? null;
  const uniqueMembers = new Set<string>();
  if (projectLeadId) uniqueMembers.add(String(projectLeadId));
  if (assigneeId) uniqueMembers.add(String(assigneeId));
  teamMemberIds.forEach((id: string) => { if (id) uniqueMembers.add(id); });
  const computedTeamSize = uniqueMembers.size;

  // Keep tasks array if present
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  
  // Use tasks_count from backend if available (from withCount('tasks'))
  const backendTasksCount = project.tasks_count ?? project.tasksCount ?? null;
  const backendCompletedCount = project.completed_tasks_count ?? project.completedTasksCount ?? null;
  
  // Prefer the tasks array length when it's available and larger than withCount
  // (withCount may return 0 due to relationship issues while eager-loaded tasks are correct)
  const tasksFromArray = tasks.length;
  const completedFromArray = tasks.filter((t: any) => t.status === 'completed').length;
  
  const finalTasksCount = Math.max(
    backendTasksCount != null ? Number(backendTasksCount) : 0,
    tasksFromArray
  );
  const finalCompletedCount = Math.max(
    backendCompletedCount != null ? Number(backendCompletedCount) : 0,
    completedFromArray
  );

  return {
    ...project,
    // Enforced status
    status,
    // Ensure financial fields are always present as numbers
    contractValueNGN,
    contractValueUSD,
    marginPercentNGN,
    marginPercentUSD,
    marginValueNGN,
    marginValueUSD,
    // Normalized fields
    clientName: project.clientName ?? project.client_name ?? '',
    clientContact: project.clientContact ?? project.client_contact ?? '',
    startDate: project.startDate ?? project.start_date ?? '',
    endDate: project.endDate ?? project.end_date ?? '',
    pipelineStage,
    pipelineIntakeDate: project.pipelineIntakeDate ?? project.pipeline_intake_date ?? null,
    expectedCloseDate: project.expectedCloseDate ?? project.expected_close_date ?? null,
    businessSegment: project.businessSegment ?? project.business_segment ?? '',
    subProduct: project.subProduct ?? project.sub_product ?? '',
    projectLeadId,
    assigneeId,
    salesLead: project.salesLead ?? project.sales_lead ?? null,
    channelPartner: project.channelPartner ?? project.channel_partner ?? '',
    projectLeadComments: project.projectLeadComments ?? project.project_lead_comments ?? '',
    dealProbability: project.dealProbability ?? project.deal_probability ?? project.riskLevel ?? project.risk_level ?? 'low',
    projectImage: project.projectImage ?? project.project_image ?? undefined,
    teamMemberIds,
    teamSize: computedTeamSize || project.teamSize || project.team_size || 0,
    tasks,
    tasksCount: finalTasksCount,
    completedTasksCount: finalCompletedCount,
  };
};

export const projectsService = {
  // Get all projects (handles both paginated and non-paginated API responses)
  getAll: async (filters?: ProjectFilters): Promise<Project[]> => {
    try {
      let allProjects: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await api.get('/api/projects', {
          params: { ...filters, page: currentPage, per_page: 500 },
        });
        const data = response.data;

        let projects: any[] = [];

        if (Array.isArray(data)) {
          projects = data;
          hasMorePages = false; // Non-paginated response
        } else if (Array.isArray(data?.data)) {
          projects = data.data;
          // Check for Laravel-style pagination metadata
          if (data.last_page != null || data.next_page_url != null) {
            hasMorePages = currentPage < (data.last_page ?? 1);
            currentPage++;
          } else {
            hasMorePages = false;
          }
        } else if (Array.isArray(data?.data?.data)) {
          projects = data.data.data;
          const meta = data.data;
          hasMorePages = currentPage < (meta.last_page ?? 1);
          currentPage++;
          console.warn('[Projects Service] Detected double-wrapped paginated response');
        } else if (Array.isArray(data?.projects)) {
          projects = data.projects;
          hasMorePages = false;
        } else if (Array.isArray(data?.results)) {
          projects = data.results;
          hasMorePages = false;
        } else {
          // Try to find any array value on the response object
          for (const key of Object.keys(data || {})) {
            if (Array.isArray((data as any)[key])) {
              projects = (data as any)[key];
              console.warn(`[Projects Service] Found projects array under key '${key}'`);
              break;
            }
          }
          hasMorePages = false;
        }

        allProjects = allProjects.concat(projects);

        // Safety: if we got 0 results, stop
        if (projects.length === 0) hasMorePages = false;
      }

      const projects = allProjects;
      if (currentPage > 2) {
        console.log(`[Projects Service] Fetched ${currentPage - 1} pages, total ${projects.length} projects`);
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
        console.debug('[Projects Service] API returned 0 projects');
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

      // Debug: Log normalized projects with verbose financial data report
      const projectsWithFinancialData = normalized.filter(p => (p.contractValueNGN || 0) > 0 || (p.contractValueUSD || 0) > 0);
      
      console.group('[Projects Service] Financial Data Report');
      console.log(`Total projects: ${normalized.length}`);
      console.log(`Projects with contract values: ${projectsWithFinancialData.length}`);
      
      if (projectsWithFinancialData.length > 0) {
        console.log('✅ Financial data is available:', projectsWithFinancialData.map(p => ({
          id: p.id,
          name: p.name,
          contractValueNGN: p.contractValueNGN,
          contractValueUSD: p.contractValueUSD,
          marginValueNGN: p.marginValueNGN,
          marginValueUSD: p.marginValueUSD,
        })));
      } else {
        console.warn('⚠️  No projects have contract/PO values yet');
        console.warn('This is expected if:');
        console.warn('  1. Backend database wasnt seeded with sample data');
        console.warn('  2. No projects have been created yet');
        console.warn('  3. Projects were created before financial fields existed');
        console.log('Sample from first project:', normalized[0] ? {
          id: normalized[0].id,
          name: normalized[0].name,
          contractValueNGN: normalized[0].contractValueNGN,
          contractValueUSD: normalized[0].contractValueUSD,
          hasFinancialFields: !!(normalized[0].contractValueNGN || normalized[0].contractValueUSD),
        } : 'No projects');
      }
      console.groupEnd();

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
    const requestData: Record<string, any> = { ...data };
    
    // Remove undefined values
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === undefined) {
        delete requestData[key];
      }
    });

    // Add snake_case aliases for Laravel backend
    const snakeCaseMap: Record<string, string> = {
      contractValueNGN: 'contract_value_ngn',
      contractValueUSD: 'contract_value_usd',
      marginPercentNGN: 'margin_percent_ngn',
      marginPercentUSD: 'margin_percent_usd',
      marginValueNGN: 'margin_value_ngn',
      marginValueUSD: 'margin_value_usd',
      clientName: 'client_name',
      clientContact: 'client_contact',
      startDate: 'start_date',
      endDate: 'end_date',
      pipelineStage: 'pipeline_stage',
      pipelineIntakeDate: 'pipeline_intake_date',
      expectedCloseDate: 'expected_close_date',
      businessSegment: 'business_segment',
      subProduct: 'sub_product',
      projectLeadId: 'project_lead_id',
      assigneeId: 'assignee_id',
      channelPartner: 'channel_partner',
      projectLeadComments: 'project_lead_comments',
      dealProbability: 'deal_probability',
    };

    Object.entries(snakeCaseMap).forEach(([camelKey, snakeKey]) => {
      if (camelKey in requestData) {
        requestData[snakeKey] = requestData[camelKey];
      }
    });
    
    // Log financial data being sent (for debugging)
    console.log('[Projects Service] Creating project with data:', {
      contract_value_ngn: requestData.contract_value_ngn,
      contract_value_usd: requestData.contract_value_usd,
      margin_percent_ngn: requestData.margin_percent_ngn,
      margin_percent_usd: requestData.margin_percent_usd,
      margin_value_ngn: requestData.margin_value_ngn,
      margin_value_usd: requestData.margin_value_usd,
    });
    
    const response = await api.post('/api/projects', requestData);
    const createdProject = normalizeProject(response.data);
    
    // Send notification if project lead is assigned
    if (createdProject.projectLeadId) {
      await notifyAssignment({
        type: 'project_assigned',
        userId: createdProject.projectLeadId,
        projectId: createdProject.id,
        projectName: createdProject.name,
        message: `You have been assigned as the project lead for "${createdProject.name}"`,
      });
    }
    
    return createdProject;
  },

  // Update project
  update: async (id: string, data: UpdateProjectData, originalProject?: Project): Promise<Project> => {
    // Build request: keep contract/margin fields explicit (no filtering) so backend can overwrite previous values
    const requestData: Record<string, any> = { ...data };

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

    // Add snake_case aliases for backends expecting snake_case keys
    const snakeCaseMap: Record<string, string> = {
      contractValueNGN: 'contract_value_ngn',
      contractValueUSD: 'contract_value_usd',
      marginPercentNGN: 'margin_percent_ngn',
      marginPercentUSD: 'margin_percent_usd',
      marginValueNGN: 'margin_value_ngn',
      marginValueUSD: 'margin_value_usd',
      clientName: 'client_name',
      clientContact: 'client_contact',
      startDate: 'start_date',
      endDate: 'end_date',
      pipelineStage: 'pipeline_stage',
      pipelineIntakeDate: 'pipeline_intake_date',
      expectedCloseDate: 'expected_close_date',
      businessSegment: 'business_segment',
      subProduct: 'sub_product',
      projectLeadId: 'project_lead_id',
      assigneeId: 'assignee_id',
      channelPartner: 'channel_partner',
      projectLeadComments: 'project_lead_comments',
      dealProbability: 'deal_probability',
    };

    Object.entries(snakeCaseMap).forEach(([camelKey, snakeKey]) => {
      if (camelKey in requestData) {
        requestData[snakeKey] = requestData[camelKey];
      }
    });

    // Log full payload being sent for debugging
    console.log('[Projects Service] Update request payload:', {
      projectId: id,
      ...requestData,
    });

    const response = await api.put(`/api/projects/${id}`, requestData);
    const updatedProject = normalizeProject(response.data?.data ?? response.data);
    
    // Send notification if project lead assignment changed
    if (data.projectLeadId && data.projectLeadId !== originalProject?.projectLeadId) {
      await notifyAssignment({
        type: 'project_assigned',
        userId: data.projectLeadId,
        projectId: id,
        projectName: data.name || originalProject?.name || 'Untitled Project',
        message: `You have been assigned as the project lead for "${data.name || originalProject?.name || 'Untitled Project'}"`,
      });
    }
    
    // Send notification if assignee changed
    if (data.assigneeId && data.assigneeId !== originalProject?.assigneeId) {
      await notifyAssignment({
        type: 'project_assigned',
        userId: data.assigneeId,
        projectId: id,
        projectName: data.name || originalProject?.name || 'Untitled Project',
        message: `You have been assigned to project "${data.name || originalProject?.name || 'Untitled Project'}"`,
      });
    }
    
    return updatedProject;
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

  // Get project statistics/dashboard data - with fallback to computed stats
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
      console.error('[Projects Service] Error fetching stats from API:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      // Fallback: compute stats from projects list
      console.warn('[Projects Service] Falling back to computed stats from projects list');
      try {
        const projects = await projectsService.getAll();
        
        // Try to fetch tasks, but don't fail if unavailable
        let tasks: any[] = [];
        try {
          const tasksResponse = await api.get('/api/tasks');
          tasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : 
                  Array.isArray(tasksResponse.data?.data) ? tasksResponse.data.data : [];
        } catch (tasksError) {
          console.warn('[Projects Service] Could not fetch tasks for stats fallback:', tasksError);
        }
        
        const NGN_PER_USD = parseFloat(import.meta.env.VITE_NGN_PER_USD as string) || 800;
        
        const stats: ProjectStats = {
          total: projects.length,
          totalProjects: projects.length,
          active: projects.filter((p: Project) => p.status === 'active').length,
          activeProjects: projects.filter((p: Project) => p.status === 'active').length,
          completed: projects.filter((p: Project) => p.status === 'completed').length,
          completedProjects: projects.filter((p: Project) => p.status === 'completed').length,
          highRisk: projects.filter((p: Project) => 
            p.dealProbability === 'high' || p.dealProbability === 'critical'
          ).length,
          completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
          pendingTasks: tasks.filter((t: any) => t.status !== 'completed').length,
          overdueTasks: tasks.filter((t: any) => {
            if (t.status === 'completed') return false;
            if (!t.dueDate && !t.due_date) return false;
            const dueDate = t.dueDate || t.due_date;
            return new Date(dueDate) < new Date();
          }).length,
          totalValueNgn: projects.reduce((sum: number, p: Project) => {
            const ngn = Number(p.contractValueNGN) || 0;
            const usd = Number(p.contractValueUSD) || 0;
            return sum + (ngn > 0 ? ngn : (usd > 0 ? usd * NGN_PER_USD : 0));
          }, 0),
          totalValueUsd: projects.reduce((sum: number, p: Project) => {
            const ngn = Number(p.contractValueNGN) || 0;
            const usd = Number(p.contractValueUSD) || 0;
            return sum + (usd > 0 ? usd : (ngn > 0 ? ngn / NGN_PER_USD : 0));
          }, 0),
          averageProgress: projects.length > 0 
            ? projects.reduce((sum: number, p: Project) => sum + (p.progress || 0), 0) / projects.length
            : 0,
          byStatus: {
            active: projects.filter((p: Project) => p.status === 'active').length,
            on_hold: projects.filter((p: Project) => p.status === 'on-hold').length,
            completed: projects.filter((p: Project) => p.status === 'completed').length,
            cancelled: 0,
          },
          byStage: {},
          byAssignee: [],
          recent: projects
            .sort((a: any, b: any) => 
              new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime()
            )
            .slice(0, 5),
        };
        
        console.log('[Projects Service] Computed stats from projects:', stats);
        return stats;
      } catch (fallbackError) {
        console.error('[Projects Service] Fallback computation also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  },
};
