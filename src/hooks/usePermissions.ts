import { useAuth } from '@/context/AuthContext';
import { SYSTEM_ROLE_CONFIG, SystemRole } from '@/types/auth';

export function usePermissions() {
  const { user } = useAuth();
  
  const systemRole: SystemRole = user?.systemRole || 'viewer';
  const config = SYSTEM_ROLE_CONFIG[systemRole];
  
  return {
    systemRole,
    ...config.permissions,
    // Helper function to check any permission
    hasPermission: (permission: keyof typeof config.permissions) => {
      return config.permissions[permission];
    },
  };
}
