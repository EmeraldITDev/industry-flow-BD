import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { AccessLevel, ACCESS_LEVEL_CONFIG, SystemRole, SYSTEM_ROLE_CONFIG } from '@/types/auth';
import { TeamMember, TeamRole } from '@/types';
import { teamService } from '@/services/team';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle2,
  Crown,
  Briefcase,
  ClipboardList,
  Eye,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const roleIcons: Record<AccessLevel, React.ElementType> = {
  admin: Crown,
  bd_director: Briefcase,
  pm: ClipboardList,
  viewer: Eye,
};

const SYSTEM_ROLES: { value: SystemRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'project_manager', label: 'Project Manager', description: 'Manage projects and tasks' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

// Generate a random password
function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Map system role to team role (for backend API)
const getTeamRoleFromSystemRole = (systemRole: SystemRole): TeamRole => {
  switch (systemRole) {
    case 'admin': return 'admin';
    case 'project_manager': return 'editor';
    case 'viewer': return 'viewer';
    default: return 'viewer';
  }
};

// Extended TeamMember with accessLevel and systemRole (backend may return these)
interface ExtendedTeamMember extends TeamMember {
  systemRole?: SystemRole;
  accessLevel?: AccessLevel;
}

export function AccessLevelManager() {
  const queryClient = useQueryClient();
  const { user, canManageRole } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserRole, setNewUserRole] = useState<AccessLevel>('viewer');
  const [newUserSystemRole, setNewUserSystemRole] = useState<SystemRole>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch team members from backend
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Convert TeamMember to display format (assume backend returns systemRole/accessLevel if provided)
  const displayMembers = teamMembers.map((member: ExtendedTeamMember) => ({
    ...member,
    systemRole: member.systemRole || (member.role === 'admin' ? 'admin' as SystemRole : member.role === 'editor' ? 'project_manager' as SystemRole : 'viewer' as SystemRole),
    accessLevel: member.accessLevel || (member.role === 'admin' ? 'admin' as AccessLevel : member.role === 'editor' ? 'pm' as AccessLevel : 'viewer' as AccessLevel),
  }));

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddUser = async () => {
    if (!newUserEmail.endsWith('@emeraldcfze.com')) {
      toast.error('Email must end with @emeraldcfze.com');
      return;
    }
    if (!newUserName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    const generatedPassword = generatePassword();
    const teamRole = getTeamRoleFromSystemRole(newUserSystemRole);
    const normalizedEmail = newUserEmail.toLowerCase().trim();

    setIsSubmitting(true);
    try {
      await teamService.create({
      name: newUserName,
        email: normalizedEmail,
        role: teamRole,
        department: newUserDepartment || 'General',
        systemRole: newUserSystemRole,
      accessLevel: newUserRole,
        password: generatedPassword,
      } as any);

      // Refetch team members from backend
      await queryClient.invalidateQueries({ queryKey: ['team'] });

    setNewUserEmail('');
    setNewUserName('');
      setNewUserDepartment('');
    setNewUserRole('viewer');
    setNewUserSystemRole('viewer');
    setIsAddDialogOpen(false);

      toast.success('Team member added successfully!');
    } catch (error: any) {
      console.error('Failed to add team member:', error);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || 'Failed to add team member. Please check your backend connection.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('You cannot remove yourself');
      return;
    }
    
    try {
      await teamService.delete(userId);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Team member removed successfully');
    } catch (error: any) {
      console.error('Failed to remove team member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove team member');
    }
  };

  const handleUpdateAccessLevel = async (userId: string, newAccessLevel: AccessLevel) => {
    try {
      // Note: Backend API might need to be extended to support accessLevel updates
      // For now, we'll update the role based on accessLevel
      const teamRole = newAccessLevel === 'admin' ? 'admin' as TeamRole : 
                      newAccessLevel === 'pm' ? 'editor' as TeamRole : 
                      'viewer' as TeamRole;
      await teamService.updateRole(userId, teamRole);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Access level updated successfully');
    } catch (error: any) {
      console.error('Failed to update access level:', error);
      toast.error(error.response?.data?.message || 'Failed to update access level');
    }
  };

  const handleUpdateSystemRole = async (userId: string, newSystemRole: SystemRole) => {
    try {
      const teamRole = getTeamRoleFromSystemRole(newSystemRole);
      await teamService.updateRole(userId, teamRole);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('System role updated successfully');
    } catch (error: any) {
      console.error('Failed to update system role:', error);
      toast.error(error.response?.data?.message || 'Failed to update system role');
    }
  };

  const canAddUsers = user?.accessLevel === 'admin' || user?.accessLevel === 'bd_director';
  const canRemoveUsers = user?.accessLevel === 'admin';
  const canEditSystemRoles = user?.systemRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Access Level Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team member permissions and access levels
          </p>
        </div>
        {canAddUsers && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Invite a new member to Emerald PM
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@emeraldcfze.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be an @emeraldcfze.com email
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Engineering"
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>System Role</Label>
                  <Select value={newUserSystemRole} onValueChange={(v) => setNewUserSystemRole(v as SystemRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <span>{role.label}</span>
                          <span className="text-muted-foreground ml-1">- {role.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AccessLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACCESS_LEVEL_CONFIG)
                        .filter(([key]) => canManageRole(key as AccessLevel))
                        .map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Adding...' : 'Add Member'}
                </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Users List */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Team Members</CardTitle>
          </div>
          <CardDescription>
            {isLoadingMembers ? 'Loading...' : `${displayMembers.length} member${displayMembers.length !== 1 ? 's' : ''} in your organization`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {displayMembers.map((teamUser) => {
                const RoleIcon = roleIcons[teamUser.accessLevel];
                const config = ACCESS_LEVEL_CONFIG[teamUser.accessLevel];
                const isCurrentUser = teamUser.id === user?.id;
                const canEdit = !isCurrentUser && canManageRole(teamUser.accessLevel);

                return (
                  <div
                    key={teamUser.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(teamUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{teamUser.name}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              You
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{teamUser.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* System Role */}
                      {canEditSystemRoles && !isCurrentUser ? (
                        <Select
                          value={teamUser.systemRole || 'viewer'}
                            onValueChange={(value) => handleUpdateSystemRole(teamUser.id, value as SystemRole)}
                        >
                          <SelectTrigger className="w-[170px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYSTEM_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {SYSTEM_ROLE_CONFIG[teamUser.systemRole || 'viewer']?.label || 'Viewer'}
                        </Badge>
                      )}

                      {/* Access Level */}
                      {canEdit ? (
                        <Select
                          value={teamUser.accessLevel}
                            onValueChange={(value) => handleUpdateAccessLevel(teamUser.id, value as AccessLevel)}
                        >
                          <SelectTrigger className="w-[160px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACCESS_LEVEL_CONFIG)
                              .filter(([key]) => canManageRole(key as AccessLevel))
                              .map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    {cfg.label}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={`gap-1.5 ${config.color}`}>
                          <RoleIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      )}

                      {canRemoveUsers && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveUser(teamUser.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Permissions Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(ACCESS_LEVEL_CONFIG).map(([key, config]) => {
          const RoleIcon = roleIcons[key as AccessLevel];
          return (
            <Card key={key} className="border-border/50 overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <RoleIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{config.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {config.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {config.permissions.map((permission, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{permission}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
