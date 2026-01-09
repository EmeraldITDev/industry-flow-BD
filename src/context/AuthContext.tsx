import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AccessLevel, AuthState, SystemRole } from '@/types/auth';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserRole: (userId: string, newRole: AccessLevel) => boolean;
  updateUserSystemRole: (userId: string, newSystemRole: SystemRole) => boolean;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>;
  canManageRole: (targetRole: AccessLevel) => boolean;
  canReassignProjects: () => boolean;
  canApproveDueDates: () => boolean;
  getAllUsers: () => User[];
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive'>) => void;
  removeUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map backend role to AccessLevel
const mapRoleToAccessLevel = (role: string): AccessLevel => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'bd_director':
    case 'director':
      return 'bd_director';
    case 'pm':
    case 'project_manager':
      return 'pm';
    default:
      return 'viewer';
  }
};

// Map backend role to SystemRole
const mapRoleToSystemRole = (role: string): SystemRole => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'pm':
    case 'project_manager':
    case 'bd_director':
    case 'director':
      return 'project_manager';
    default:
      return 'viewer';
  }
};

// Convert backend user to frontend User type
const convertToUser = (backendUser: any): User => ({
  id: String(backendUser.id),
  email: backendUser.email,
  name: backendUser.name,
  accessLevel: mapRoleToAccessLevel(backendUser.role),
  systemRole: mapRoleToSystemRole(backendUser.role),
  avatarUrl: backendUser.avatarUrl,
  createdAt: new Date(backendUser.createdAt || Date.now()),
  isActive: true,
});

// Fallback users for local development/offline mode
const fallbackUsers: User[] = [
  {
    id: '1',
    email: 'chiemela.ikechi@emeraldcfze.com',
    name: 'Chiemela Ikechi',
    accessLevel: 'bd_director',
    systemRole: 'admin',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(fallbackUsers);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const token = authService.getToken();
      const storedUser = authService.getUser();

      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const userData = await authService.me();
          const convertedUser = convertToUser(userData);
          setUser(convertedUser);
        } catch (error: any) {
          // Only clear token on 401, not on network errors
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          } else {
            // For network errors, use stored user data as fallback
            const convertedUser = convertToUser(storedUser);
            setUser(convertedUser);
          }
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });
      const convertedUser = convertToUser(response.user);
      setUser(convertedUser);
      toast.success(`Welcome, ${convertedUser.name}!`);
      
      if (response.requiresPasswordChange) {
        toast.info('Please change your password');
      }
      
      setIsLoading(false);
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid email or password';
      toast.error(message);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Ignore errors, clear local state anyway
    }
    setUser(null);
    toast.info('You have been logged out');
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<void> => {
    if (!user) return;
    
    // TODO: Add API call to update profile on backend
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    setUsers(prev => prev.map(u => 
      u.id === user.id ? updatedUser : u
    ));
    
    toast.success('Profile updated successfully');
  };

  const canManageRole = (targetRole: AccessLevel): boolean => {
    if (!user) return false;
    if (user.accessLevel === 'admin') return true;
    if (user.accessLevel === 'bd_director') {
      return targetRole === 'pm' || targetRole === 'viewer';
    }
    return false;
  };

  const canReassignProjects = (): boolean => {
    if (!user) return false;
    return user.accessLevel === 'admin' || user.accessLevel === 'bd_director';
  };

  const canApproveDueDates = (): boolean => {
    if (!user) return false;
    return user.accessLevel === 'admin' || user.accessLevel === 'bd_director';
  };

  const updateUserRole = (userId: string, newRole: AccessLevel): boolean => {
    if (!user) return false;
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;

    if (user.accessLevel === 'admin') {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, accessLevel: newRole } : u
      ));
      toast.success(`Updated ${targetUser.name}'s role to ${newRole}`);
      return true;
    }

    if (user.accessLevel === 'bd_director') {
      if (targetUser.accessLevel === 'admin' || targetUser.accessLevel === 'bd_director') {
        toast.error('You cannot modify this user\'s role');
        return false;
      }
      if (newRole === 'admin' || newRole === 'bd_director') {
        toast.error('You cannot assign this role');
        return false;
      }
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, accessLevel: newRole } : u
      ));
      toast.success(`Updated ${targetUser.name}'s role to ${newRole}`);
      return true;
    }

    toast.error('You do not have permission to change roles');
    return false;
  };

  const updateUserSystemRole = (userId: string, newSystemRole: SystemRole): boolean => {
    if (!user) return false;
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;

    if (user.systemRole !== 'admin') {
      toast.error('You do not have permission to change system roles');
      return false;
    }

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, systemRole: newSystemRole } : u
    ));
    toast.success(`Updated ${targetUser.name}'s system role to ${newSystemRole}`);
    return true;
  };

  const getAllUsers = (): User[] => users;

  const addUser = (newUser: Omit<User, 'id' | 'createdAt' | 'isActive'>) => {
    const createdUser: User = {
      ...newUser,
      id: Date.now().toString(),
      createdAt: new Date(),
      isActive: true,
    };
    setUsers(prev => [...prev, createdUser]);
    toast.success(`Added ${createdUser.name} to the team`);
  };

  const removeUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(`Removed ${targetUser.name} from the team`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUserRole,
        updateUserSystemRole,
        updateProfile,
        canManageRole,
        canReassignProjects,
        canApproveDueDates,
        getAllUsers,
        addUser,
        removeUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
