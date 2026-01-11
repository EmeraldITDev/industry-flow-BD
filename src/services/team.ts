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
    const response = await api.get('/api/team', { params: filters });
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

  // Delete team member
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/team/${id}`);
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
