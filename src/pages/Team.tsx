import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, MoreHorizontal, Shield, Edit, Eye, Trash2, Users, UserPlus, Loader2, Copy, Check } from 'lucide-react';
import { projects } from '@/data/mockData';
import { TeamMember, TeamRole } from '@/types';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';
import { AccessLevel, ACCESS_LEVEL_CONFIG, SystemRole, SYSTEM_ROLE_CONFIG } from '@/types/auth';
import { teamService } from '@/services/team';
import { Skeleton } from '@/components/ui/skeleton';

const SYSTEM_ROLES: { value: SystemRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'project_manager', label: 'Project Manager', description: 'Manage projects and tasks' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

const roleColors: Record<TeamRole, string> = {
  admin: 'bg-destructive/20 text-destructive',
  editor: 'bg-chart-2/20 text-chart-2',
  viewer: 'bg-muted text-muted-foreground',
};

const roleIcons: Record<TeamRole, typeof Shield> = {
  admin: Shield,
  editor: Edit,
  viewer: Eye,
};

const roleDescriptions: Record<TeamRole, string> = {
  admin: 'Full access: manage team, projects, and settings',
  editor: 'Can create and edit projects and tasks',
  viewer: 'Read-only access to projects and tasks',
};

// Generate a random password
function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function Team() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<{ email: string; password: string } | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserSystemRole, setNewUserSystemRole] = useState<SystemRole>('viewer');
  const [newUserAccessLevel, setNewUserAccessLevel] = useState<AccessLevel>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { canManageTeam } = usePermissions();
  const { canManageRole } = useAuth();

  // Fetch team members from backend
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Map system role to team role
  const getTeamRoleFromSystemRole = (systemRole: SystemRole): TeamRole => {
    switch (systemRole) {
      case 'admin': return 'admin';
      case 'project_manager': return 'editor';
      case 'viewer': return 'viewer';
      default: return 'viewer';
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddMember = async () => {
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
      // Send password to backend so it can create the user with auth credentials
      const response = await teamService.create({
        name: newUserName,
        email: normalizedEmail,
        role: teamRole,
        department: newUserDepartment || 'General',
        systemRole: newUserSystemRole,
        accessLevel: newUserAccessLevel,
        password: generatedPassword, // Backend will hash this
      } as any);

      // Use password from response if backend generates it, otherwise use our generated one
      const finalPassword = (response as any).password || generatedPassword;

      // Refetch team members from backend to get the complete list
      await queryClient.invalidateQueries({ queryKey: ['team'] });

      // Show credentials dialog
      setNewUserCredentials({ email: normalizedEmail, password: finalPassword });
      setIsAddDialogOpen(false);
      setIsCredentialsDialogOpen(true);

      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserDepartment('');
      setNewUserSystemRole('viewer');
      setNewUserAccessLevel('viewer');

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

  const handleUpdateRole = async (memberId: string, newRole: TeamRole) => {
    try {
      await teamService.updateRole(memberId, newRole);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Role updated successfully');
    } catch (error: any) {
      console.error('Failed to update role:', error);
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    try {
      await teamService.delete(memberId);
      await queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success(`${member?.name} has been removed from the team`);
    } catch (error: any) {
      console.error('Failed to delete member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove team member');
    }
  };

  const handleAssignProject = (memberId: string, projectId: string) => {
    setMembers(members.map(m => {
      if (m.id === memberId) {
        const currentProjects = m.assignedProjects || [];
        const assignedProjects = currentProjects.includes(projectId)
          ? currentProjects.filter(p => p !== projectId)
          : [...currentProjects, projectId];
        return { ...m, assignedProjects };
      }
      return m;
    }));
    toast.success('Project assignment updated');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const adminCount = members.filter(m => m.role === 'admin').length;
  const editorCount = members.filter(m => m.role === 'editor').length;
  const viewerCount = members.filter(m => m.role === 'viewer').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage team members and their permissions
          </p>
        </div>
        {canManageTeam && (
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
                <Select value={newUserAccessLevel} onValueChange={(v) => setNewUserAccessLevel(v as AccessLevel)}>
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
              <Button onClick={handleAddMember} className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Credentials Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Member Added Successfully!</DialogTitle>
            <DialogDescription>
              Please share these login credentials with the new team member. Make sure to copy them now as the password cannot be retrieved later.
            </DialogDescription>
          </DialogHeader>
          {newUserCredentials && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-background px-3 py-2 rounded border">
                      {newUserCredentials.email}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyToClipboard(newUserCredentials.email, 'email')}
                    >
                      {copiedField === 'email' ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-background px-3 py-2 rounded border font-mono">
                      {newUserCredentials.password}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyToClipboard(newUserCredentials.password, 'password')}
                    >
                      {copiedField === 'password' ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The user should change their password after first login.
              </p>
              <Button onClick={() => setIsCredentialsDialogOpen(false)} className="w-full">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Editors</CardTitle>
            <Edit className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{editorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewerCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
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
                <TableHead>Role</TableHead>
                <TableHead>Assigned Projects</TableHead>
                {canManageTeam && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const RoleIcon = roleIcons[member.role];
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.department}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[member.role]}>
                        <RoleIcon className="mr-1 h-3 w-3" />
                        <span className="capitalize">{member.role}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            {(member.assignedProjects || []).length} Projects
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                          {projects.map((project) => (
                            <DropdownMenuItem
                              key={project.id}
                              onClick={() => handleAssignProject(member.id, project.id)}
                            >
                              <span className={(member.assignedProjects || []).includes(project.id) ? 'font-bold' : ''}>
                                {(member.assignedProjects || []).includes(project.id) ? '✓ ' : ''}
                                {project.name}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    {canManageTeam && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'admin')}>
                              <Shield className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'editor')}>
                              <Edit className="mr-2 h-4 w-4" />
                              Make Editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'viewer')}>
                              <Eye className="mr-2 h-4 w-4" />
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-destructive"
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

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(['admin', 'editor', 'viewer'] as TeamRole[]).map((role) => {
              const RoleIcon = roleIcons[role];
              return (
                <div key={role} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={roleColors[role]}>
                      <RoleIcon className="mr-1 h-3 w-3" />
                      <span className="capitalize">{role}</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
                  <ul className="mt-2 text-sm space-y-1">
                    {role === 'admin' && (
                      <>
                        <li>✓ Manage team members</li>
                        <li>✓ Create/edit/delete projects</li>
                        <li>✓ Assign tasks</li>
                        <li>✓ View all data</li>
                      </>
                    )}
                    {role === 'editor' && (
                      <>
                        <li>✓ Create/edit projects</li>
                        <li>✓ Create/edit tasks</li>
                        <li>✓ View all data</li>
                        <li>✗ Manage team</li>
                      </>
                    )}
                    {role === 'viewer' && (
                      <>
                        <li>✓ View projects</li>
                        <li>✓ View tasks</li>
                        <li>✗ Edit anything</li>
                        <li>✗ Manage team</li>
                      </>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
