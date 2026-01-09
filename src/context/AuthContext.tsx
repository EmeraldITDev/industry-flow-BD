import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AccessLevel, AuthState } from '@/types/auth';
import { toast } from 'sonner';
import { loginRequest, logoutRequest, BackendUser } from '@/services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserRole: (userId: string, newRole: AccessLevel) => boolean;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>;
  canManageRole: (targetRole: AccessLevel) => boolean;
  canReassignProjects: () => boolean;
  canApproveDueDates: () => boolean;
  getAllUsers: () => User[];
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive'>) => void;
  removeUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// User credentials map (email -> password)
const userCredentials: Record<string, string> = {
  'chiemela.ikechi@emeraldcfze.com': 'emerald2024',
  'admin@emeraldcfze.com': 'admin123',
  'pm@emeraldcfze.com': 'pm123',
  'sarah.johnson@emeraldcfze.com': 'emerald2024',
  'michael.chen@emeraldcfze.com': 'emerald2024',
};

// Initial users database
const initialUsers: User[] = [
  {
    id: '1',
    email: 'chiemela.ikechi@emeraldcfze.com',
    name: 'Chiemela Ikechi',
    accessLevel: 'bd_director',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    email: 'admin@emeraldcfze.com',
    name: 'System Admin',
    accessLevel: 'admin',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '3',
    email: 'pm@emeraldcfze.com',
    name: 'Project Manager',
    accessLevel: 'pm',
    createdAt: new Date('2024-02-15'),
    isActive: true,
  },
  {
    id: '4',
    email: 'sarah.johnson@emeraldcfze.com',
    name: 'Sarah Johnson',
    accessLevel: 'pm',
    createdAt: new Date('2024-03-10'),
    isActive: true,
  },
  {
    id: '5',
    email: 'michael.chen@emeraldcfze.com',
    name: 'Michael Chen',
    accessLevel: 'viewer',
    createdAt: new Date('2024-04-01'),
    isActive: true,
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('industry_flow_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser({
          ...parsed,
          createdAt: new Date(parsed.createdAt),
        });
      } catch {
        localStorage.removeItem('industry_flow_user');
        localStorage.removeItem('industry_flow_token');
      }
    }
    setIsLoading(false);
  }, []);

  const mapBackendUserToAccessLevel = (backendUser: BackendUser): AccessLevel => {
    const role = (backendUser.role || '').toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'bd_director' || role === 'bd director' || role === 'business_development_director') {
      return 'bd_director';
    }
    if (role === 'pm' || role === 'project_manager' || role === 'project manager') {
      return 'pm';
    }
    return 'viewer';
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const data = await loginRequest({ email, password });
      const backendUser = data.user;

      const accessLevel = mapBackendUserToAccessLevel(backendUser);

      const appUser: User = {
        id: String(backendUser.id),
        email: backendUser.email,
        name: backendUser.name,
        accessLevel,
        createdAt: new Date(backendUser.createdAt),
        isActive: true,
      };

      setUser(appUser);
      // Persist session
      localStorage.setItem('industry_flow_user', JSON.stringify(appUser));
      localStorage.setItem('industry_flow_token', data.token);

      toast.success(`Welcome, ${backendUser.name}!`);
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.email?.[0] ||
        'Login failed. Please check your credentials.';
      toast.error(message);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('industry_flow_user');
    localStorage.removeItem('industry_flow_token');
    // Fire and forget backend logout
    logoutRequest();
    toast.info('You have been logged out');
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<void> => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('industry_flow_user', JSON.stringify(updatedUser));
    
    // Also update in users list
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

    // Admin can change anyone's role
    if (user.accessLevel === 'admin') {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, accessLevel: newRole } : u
      ));
      toast.success(`Updated ${targetUser.name}'s role to ${newRole}`);
      return true;
    }

    // BD Director can only manage PM and Viewer roles
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
