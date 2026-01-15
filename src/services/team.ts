import api from './api';
import { TeamMember, TeamRole } from '@/types';
import { AccessLevel, SystemRole } from '@/types/auth';

export interface CreateTeamMemberData {
  name: string;
  email: string;
  role: TeamRole;
  department: string;
  systemRole?: SystemRole;
  accessLevel?: AccessLevel;
}

export interface UpdateTeamMemberData extends Partial<CreateTeamMemberData> {
  assignedProjects?: string[];
}

export interface TeamMemberFilters {
  role?: TeamRole;
  department?: string;
  search?: string;
  all?: boolean; // Use ?all=true for plain array response
}

export interface DeletionWarning {
  hasAssignments: boolean;
  ledProjects: Array<{ id: number; name: string }>;
  assignedProjects: Array<{ id: number; name: string }>;
  tasks: Array<{ id: number; title: string; projectId: number; projectName: string }>;
  warningMessage: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  removedFromProjects: number;
  removedFromTasks: number;
}

// Helper to normalize array responses from backend
const normalizeArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

export const teamService = {
  // Get all team members
  getAll: async (filters?: TeamMemberFilters): Promise<TeamMember[]> => {
    const params = { ...filters, all: true }; // Always use all=true for plain array
    const response = await api.get('/api/team', { params });
    return normalizeArray(response.data);
  },

  // Get single team member by ID
  getById: async (id: string): Promise<TeamMember> => {
    const response = await api.get(`/api/team/${id}`);
    return response.data;
  },

  // Create new team member
  create: async (data: CreateTeamMemberData): Promise<TeamMember> => {
    const response = await api.post('/api/team', data);
    return response.data;
  },

  // Update team member
  update: async (id: string, data: UpdateTeamMemberData): Promise<TeamMember> => {
    const response = await api.put(`/api/team/${id}`, data);
    return response.data;
  },

  // Get projects for a specific team member
  getProjects: async (id: string): Promise<any[]> => {
    const response = await api.get(`/api/team/${id}/projects`);
    return normalizeArray(response.data);
  },

  // Get deletion warning information
  getDeletionWarning: async (id: string): Promise<DeletionWarning> => {
    const response = await api.get(`/api/team/${id}/deletion-warning`);
    return response.data;
  },

  // Delete team member (returns removal counts)
  delete: async (id: string): Promise<DeleteResponse> => {
    const response = await api.delete(`/api/team/${id}`);
    return response.data;
  },

  // Update team member role
  updateRole: async (id: string, role: TeamRole): Promise<TeamMember> => {
    const response = await api.patch(`/api/team/${id}/role`, { role });
    return response.data;
  },

  // Assign projects to team member
  assignProjects: async (id: string, projectIds: string[]): Promise<TeamMember> => {
    const response = await api.patch(`/api/team/${id}/projects`, { projectIds });
    return response.data;
  },
};
