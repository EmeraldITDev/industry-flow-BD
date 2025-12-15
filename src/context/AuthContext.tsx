import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AccessLevel, AuthState } from '@/types/auth';
import { toast } from 'sonner';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserRole: (userId: string, newRole: AccessLevel) => boolean;
  canManageRole: (targetRole: AccessLevel) => boolean;
  canReassignProjects: () => boolean;
  canApproveDueDates: () => boolean;
  getAllUsers: () => User[];
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive'>) => void;
  removeUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Test account creation date - will expire 30 days after creation
const TEST_ACCOUNT_CREATED = new Date();
const TEST_ACCOUNT_EXPIRES = new Date(TEST_ACCOUNT_CREATED.getTime() + 30 * 24 * 60 * 60 * 1000);

// Mock users database
const initialUsers: User[] = [
  {
    id: '1',
    email: 'admin@emeraldcfze.com',
    name: 'System Admin',
    accessLevel: 'admin',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    email: 'director@emeraldcfze.com',
    name: 'Sarah Johnson',
    accessLevel: 'bd_director',
    createdAt: new Date('2024-02-15'),
    isActive: true,
  },
  {
    id: '3',
    email: 'pm@emeraldcfze.com',
    name: 'Michael Chen',
    accessLevel: 'pm',
    createdAt: new Date('2024-03-10'),
    isActive: true,
  },
  {
    id: '4',
    email: 'test@emeraldcfze.com',
    name: 'Test User',
    accessLevel: 'pm',
    createdAt: TEST_ACCOUNT_CREATED,
    expiresAt: TEST_ACCOUNT_EXPIRES,
    isActive: new Date() < TEST_ACCOUNT_EXPIRES,
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

    // Check for test account
    if (email === 'test@emeraldcfze.com' && password === 'test') {
      const testUser = users.find(u => u.email === 'test@emeraldcfze.com');
      if (testUser) {
        // Check if test account has expired
        if (testUser.expiresAt && new Date(testUser.expiresAt) < new Date()) {
          toast.error('Test account has expired');
          setIsLoading(false);
          return false;
        }
        setUser(testUser);
        localStorage.setItem('emerald_pm_user', JSON.stringify(testUser));
        toast.success(`Welcome, ${testUser.name}!`);
        setIsLoading(false);
        return true;
      }
    }

    // Find user in mock database
    const foundUser = users.find(u => u.email === email && u.isActive);
    if (foundUser) {
      // For demo purposes, accept any password for valid users
      setUser(foundUser);
      localStorage.setItem('emerald_pm_user', JSON.stringify(foundUser));
      toast.success(`Welcome, ${foundUser.name}!`);
      setIsLoading(false);
      return true;
    }

    toast.error('Invalid credentials');
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('emerald_pm_user');
    toast.info('You have been logged out');
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
    const user: User = {
      ...newUser,
      id: Date.now().toString(),
      createdAt: new Date(),
      isActive: true,
    };
    setUsers(prev => [...prev, user]);
    toast.success(`Added ${user.name} to the team`);
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
