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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
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
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { projectsService } from '@/services/projects';
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

  // Fetch projects from backend
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
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
    
    const teamUser = teamMembers.find(m => m.id === userId);
    if (!teamUser) {
      toast.error('User not found');
      return;
    }
    
    if (!confirm(`Are you sure you want to remove ${teamUser.name} from the team? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await teamService.delete(userId);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success(`${teamUser.name} has been removed from the team`);
    } catch (error: any) {
      console.error('Failed to remove team member:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove team member';
      toast.error(errorMessage);
    }
  };

  const handleUpdateAccessLevel = async (userId: string, newAccessLevel: AccessLevel) => {
    try {
      // Update accessLevel directly using the update method
      await teamService.update(userId, { accessLevel: newAccessLevel });
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Access level updated successfully');
    } catch (error: any) {
      console.error('Failed to update access level:', error);
      toast.error(error.response?.data?.message || 'Failed to update access level');
    }
  };

  const handleUpdateSystemRole = async (userId: string, newSystemRole: SystemRole) => {
    try {
      // Update systemRole directly using the update method
      await teamService.update(userId, { systemRole: newSystemRole });
      // Also update the team role for backward compatibility
      const teamRole = getTeamRoleFromSystemRole(newSystemRole);
      await teamService.updateRole(userId, teamRole);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('System role updated successfully');
    } catch (error: any) {
      console.error('Failed to update system role:', error);
      toast.error(error.response?.data?.message || 'Failed to update system role');
    }
  };

  const handleAssignProject = async (memberId: string, projectId: string) => {
    try {
      const member = teamMembers.find(m => m.id === memberId);
      if (!member) return;
      
      const currentProjects = (member.assignedProjects || []).map(id => String(id));
      const projectIdStr = String(projectId);
      const assignedProjects = currentProjects.includes(projectIdStr)
        ? currentProjects.filter(p => p !== projectIdStr)
        : [...currentProjects, projectIdStr];
      
      await teamService.assignProjects(memberId, assignedProjects);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Project assignment updated');
    } catch (error: any) {
      console.error('Failed to update project assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to update project assignment');
    }
  };

  const roleColors: Record<TeamRole, string> = {
    admin: 'bg-destructive/20 text-destructive',
    editor: 'bg-chart-2/20 text-chart-2',
    viewer: 'bg-muted text-muted-foreground',
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
                <Button onClick={handleAddUser} className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Adding...' : 'Add Member'}
                </Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Assigned Projects</TableHead>
                  {canRemoveUsers && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMembers.map((teamUser) => {
                  const RoleIcon = roleIcons[teamUser.accessLevel];
                  const config = ACCESS_LEVEL_CONFIG[teamUser.accessLevel];
                  const isCurrentUser = teamUser.id === user?.id;
                  const canEdit = !isCurrentUser && canManageRole(teamUser.accessLevel);
                  const memberRole = teamUser.role || 'viewer';
                  const RoleIconTeam = memberRole === 'admin' ? Shield : memberRole === 'editor' ? Briefcase : Eye;

                  return (
                    <TableRow key={teamUser.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(teamUser.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {teamUser.name}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{teamUser.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{teamUser.department}</TableCell>
                      <TableCell>
                        {canEditSystemRoles && !isCurrentUser ? (
                          <Select
                            value={teamUser.systemRole || 'viewer'}
                            onValueChange={(value) => handleUpdateSystemRole(teamUser.id, value as SystemRole)}
                          >
                            <SelectTrigger className="w-[170px] h-8">
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
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Select
                            value={teamUser.accessLevel}
                            onValueChange={(value) => handleUpdateAccessLevel(teamUser.id, value as AccessLevel)}
                          >
                            <SelectTrigger className="w-[160px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ACCESS_LEVEL_CONFIG)
                                .filter(([key]) => canManageRole(key as AccessLevel))
                                .map(([key, cfg]) => (
                                  <SelectItem key={key} value={key}>
                                    {cfg.label}
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
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              {(teamUser.assignedProjects || []).length} Projects
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[250px]">
                            {allProjects.length === 0 ? (
                              <DropdownMenuItem disabled>No projects available</DropdownMenuItem>
                            ) : (
                              allProjects.map((project) => {
                                const projectId = String(project.id);
                                const isAssigned = (teamUser.assignedProjects || []).map(id => String(id)).includes(projectId);
                                return (
                                  <DropdownMenuItem
                                    key={projectId}
                                    onSelect={(e) => {
                                      e.preventDefault();
                                    }}
                                    className="flex items-center justify-between"
                                  >
                                    <span
                                      onClick={() => handleAssignProject(teamUser.id, projectId)}
                                      className={`flex-1 ${isAssigned ? 'font-bold' : ''}`}
                                    >
                                      {isAssigned ? '✓ ' : ''}
                                      {project.name}
                                    </span>
                                    {isAssigned && (
                                      <Link
                                        to={`/projects/${projectId}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="ml-2 text-muted-foreground hover:text-foreground"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Link>
                                    )}
                                  </DropdownMenuItem>
                                );
                              })
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      {canRemoveUsers && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleRemoveUser(teamUser.id)}
                                className="text-destructive"
                                disabled={isCurrentUser}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
