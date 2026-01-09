import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, AccessLevel, ACCESS_LEVEL_CONFIG } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle2,
  Crown,
  Briefcase,
  ClipboardList,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const roleIcons: Record<AccessLevel, React.ElementType> = {
  admin: Crown,
  bd_director: Briefcase,
  pm: ClipboardList,
  viewer: Eye,
};

type SystemRole = 'admin' | 'project_manager' | 'viewer';

const SYSTEM_ROLES: { value: SystemRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'project_manager', label: 'Project Manager', description: 'Manage projects and tasks' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

export function AccessLevelManager() {
  const { user, getAllUsers, updateUserRole, canManageRole, addUser, removeUser } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AccessLevel>('viewer');
  const [newUserSystemRole, setNewUserSystemRole] = useState<SystemRole>('viewer');

  const allUsers = getAllUsers();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddUser = () => {
    if (!newUserEmail.endsWith('@emeraldcfze.com')) {
      toast.error('Email must end with @emeraldcfze.com');
      return;
    }
    if (!newUserName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    addUser({
      email: newUserEmail,
      name: newUserName,
      accessLevel: newUserRole,
    });

    setNewUserEmail('');
    setNewUserName('');
    setNewUserRole('viewer');
    setNewUserSystemRole('viewer');
    setIsAddDialogOpen(false);
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === user?.id) {
      toast.error('You cannot remove yourself');
      return;
    }
    removeUser(userId);
  };

  const canAddUsers = user?.accessLevel === 'admin' || user?.accessLevel === 'bd_director';
  const canRemoveUsers = user?.accessLevel === 'admin';

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
                <Button onClick={handleAddUser} className="w-full">
                  Add Member
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
            {allUsers.length} member{allUsers.length !== 1 ? 's' : ''} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {allUsers.map((teamUser) => {
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
                          {teamUser.expiresAt && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Test Account
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{teamUser.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canEdit ? (
                        <Select
                          value={teamUser.accessLevel}
                          onValueChange={(value) => updateUserRole(teamUser.id, value as AccessLevel)}
                        >
                          <SelectTrigger className="w-[140px] h-9">
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
