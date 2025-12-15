export type AccessLevel = 'admin' | 'bd_director' | 'pm' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  accessLevel: AccessLevel;
  avatarUrl?: string;
  createdAt: Date;
  expiresAt?: Date; // For test accounts
  isActive: boolean;
}

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
    label: 'Project Manager',
    description: 'Project management with task and timeline control',
    color: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
    permissions: [
      'Manage assigned projects',
      'Create and edit tasks',
      'Request due date changes',
      'View team availability',
      'Generate project reports',
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
