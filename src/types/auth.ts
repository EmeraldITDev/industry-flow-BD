export type AccessLevel = 'admin' | 'bd_director' | 'pm' | 'viewer';

export type SystemRole = 'admin' | 'project_manager' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  accessLevel: AccessLevel;
  systemRole?: SystemRole;
  avatarUrl?: string;
  createdAt: Date;
  expiresAt?: Date; // For test accounts
  isActive: boolean;
}

export const SYSTEM_ROLE_CONFIG: Record<SystemRole, {
  label: string;
  description: string;
  permissions: {
    canCreateProjects: boolean;
    canEditProjects: boolean;
    canDeleteProjects: boolean;
    canManageTeam: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
    canAssignTasks: boolean;
    canEditTasks: boolean;
    canViewTasks: boolean;
  };
}> = {
  admin: {
    label: 'Admin',
    description: 'Full system access',
    permissions: {
      canCreateProjects: true,
      canEditProjects: true,
      canDeleteProjects: true,
      canManageTeam: true,
      canViewReports: true,
      canManageSettings: true,
      canAssignTasks: true,
      canEditTasks: true,
      canViewTasks: true,
    },
  },
  project_manager: {
    label: 'Editor',
    description: 'Edit projects and tasks',
    permissions: {
      canCreateProjects: true,
      canEditProjects: true,
      canDeleteProjects: false,
      canManageTeam: false,
      canViewReports: true,
      canManageSettings: false,
      canAssignTasks: true,
      canEditTasks: true,
      canViewTasks: true,
    },
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access',
    permissions: {
      canCreateProjects: false,
      canEditProjects: false,
      canDeleteProjects: false,
      canManageTeam: false,
      canViewReports: true,
      canManageSettings: false,
      canAssignTasks: false,
      canEditTasks: false,
      canViewTasks: true,
    },
  },
};

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const ACCESS_LEVEL_CONFIG: Record<AccessLevel, {
  label: string;
  description: string;
  color: string;
  permissions: string[];
}> = {
  admin: {
    label: 'Admin',
    description: 'Full system access including user management and all settings',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    permissions: [
      'Manage all users and roles',
      'Access all projects',
      'Modify system settings',
      'Approve all requests',
      'View all reports',
    ],
  },
  bd_director: {
    label: 'BD Director',
    description: 'Business development leadership with project assignment authority',
    color: 'bg-primary/10 text-primary border-primary/20',
    permissions: [
      'Assign roles to PM and Viewer users',
      'Approve due date adjustments',
      'Reassign projects between team members',
      'Access all project data',
      'Receive approval notifications',
    ],
  },
  pm: {
    label: 'Editor',
    description: 'Edit projects and manage task progress',
    color: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
    permissions: [
      'Edit assigned projects',
      'Edit task progress',
      'Access shared documents',
      'Edit project timelines',
    ],
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to assigned projects',
    color: 'bg-muted text-muted-foreground border-border',
    permissions: [
      'View assigned projects',
      'View task progress',
      'Access shared documents',
      'View project timelines',
    ],
  },
};
