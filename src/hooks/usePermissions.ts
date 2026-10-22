import { useAuth } from '@/context/AuthContext';
import { SYSTEM_ROLE_CONFIG, SystemRole } from '@/types/auth';

export function usePermissions() {
  const { user } = useAuth();
  
  const systemRole: SystemRole = user?.systemRole || 'viewer';
  const config = SYSTEM_ROLE_CONFIG[systemRole] ?? SYSTEM_ROLE_CONFIG.viewer;

  // Matches backend User::isAdminOrBdDirector() — Access Level can grant
  // delete even when System Role is Editor.
  const isAdminOrBdDirector =
    user?.accessLevel === 'admin' || user?.accessLevel === 'bd_director';
  
  return {
    systemRole,
    ...config.permissions,
    canDeleteProjects: config.permissions.canDeleteProjects || isAdminOrBdDirector,
    canDeletePartners: config.permissions.canDeletePartners || isAdminOrBdDirector,
    canCreatePartners: config.permissions.canCreatePartners || isAdminOrBdDirector,
    canEditPartners: config.permissions.canEditPartners || isAdminOrBdDirector,
    // Helper function to check any permission
    hasPermission: (permission: keyof typeof config.permissions) => {
      if (permission === 'canDeleteProjects' || permission === 'canDeletePartners') {
        return config.permissions[permission] || isAdminOrBdDirector;
      }
      if (permission === 'canCreatePartners' || permission === 'canEditPartners') {
        return config.permissions[permission] || isAdminOrBdDirector;
      }
      return config.permissions[permission];
    },
  };
}
