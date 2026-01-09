import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AccessLevel, AuthState, SystemRole } from '@/types/auth';
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
    systemRole: 'admin',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    email: 'admin@emeraldcfze.com',
    name: 'System Admin',
    accessLevel: 'admin',
    systemRole: 'admin',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '3',
    email: 'pm@emeraldcfze.com',
    name: 'Project Manager',
    accessLevel: 'pm',
    systemRole: 'project_manager',
    createdAt: new Date('2024-02-15'),
    isActive: true,
  },
  {
    id: '4',
    email: 'sarah.johnson@emeraldcfze.com',
    name: 'Sarah Johnson',
    accessLevel: 'pm',
    systemRole: 'project_manager',
    createdAt: new Date('2024-03-10'),
    isActive: true,
  },
  {
    id: '5',
    email: 'michael.chen@emeraldcfze.com',
    name: 'Michael Chen',
    accessLevel: 'viewer',
    systemRole: 'viewer',
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
    const savedUser = localStorage.getItem('emerald_pm_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      // Check if account is expired
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        localStorage.removeItem('emerald_pm_user');
        toast.error('Your account has expired');
      } else {
        setUser(parsed);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Validate email domain
    if (!email.endsWith('@emeraldcfze.com')) {
      toast.error('Only @emeraldcfze.com email addresses are allowed');
      setIsLoading(false);
      return false;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check credentials
    const expectedPassword = userCredentials[email.toLowerCase()];
    if (!expectedPassword || expectedPassword !== password) {
      toast.error('Invalid email or password');
      setIsLoading(false);
      return false;
    }

    // Find user in database
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.isActive);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('emerald_pm_user', JSON.stringify(foundUser));
      toast.success(`Welcome, ${foundUser.name}!`);
      setIsLoading(false);
      return true;
    }

    toast.error('User account not found');
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('emerald_pm_user');
    toast.info('You have been logged out');
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<void> => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('emerald_pm_user', JSON.stringify(updatedUser));
    
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

  const updateUserSystemRole = (userId: string, newSystemRole: SystemRole): boolean => {
    if (!user) return false;
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;

    // Only admin can change system roles
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
