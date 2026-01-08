import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
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
import { Plus, MoreHorizontal, Shield, Edit, Eye, Trash2, Users } from 'lucide-react';
import { teamMembers as initialTeamMembers, projects } from '@/data/mockData';
import { TeamMember, TeamRole } from '@/types';
import { toast } from 'sonner';

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

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer' as TeamRole,
    department: '',
  });

  const handleAddMember = () => {
    if (!formData.name || !formData.email || !formData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      assignedProjects: [],
      createdAt: new Date().toISOString(),
    };

    setMembers([...members, newMember]);
    setFormData({ name: '', email: '', role: 'viewer', department: '' });
    setIsAddDialogOpen(false);
    toast.success(`${newMember.name} has been added to the team`);
  };

  const handleUpdateRole = (memberId: string, newRole: TeamRole) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    toast.success('Role updated successfully');
  };

  const handleDeleteMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    setMembers(members.filter(m => m.id !== memberId));
    toast.success(`${member?.name} has been removed from the team`);
  };

  const handleAssignProject = (memberId: string, projectId: string) => {
    setMembers(members.map(m => {
      if (m.id === memberId) {
        const assignedProjects = m.assignedProjects.includes(projectId)
          ? m.assignedProjects.filter(p => p !== projectId)
          : [...m.assignedProjects, projectId];
        return { ...m, assignedProjects };
      }
      return m;
    }));
    toast.success('Project assignment updated');
  };

  const getInitials = (name: string) => {
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: TeamRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'editor', 'viewer'] as TeamRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{role}</span>
                          <span className="text-xs text-muted-foreground">
                            - {roleDescriptions[role]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMember} className="w-full">
                Add Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Projects</TableHead>
                <TableHead className="w-[50px]"></TableHead>
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
                            {member.assignedProjects.length} Projects
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                          {projects.map((project) => (
                            <DropdownMenuItem
                              key={project.id}
                              onClick={() => handleAssignProject(member.id, project.id)}
                            >
                              <span className={member.assignedProjects.includes(project.id) ? 'font-bold' : ''}>
                                {member.assignedProjects.includes(project.id) ? '✓ ' : ''}
                                {project.name}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
