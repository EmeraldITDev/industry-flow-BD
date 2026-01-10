import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth';
import { teamService } from '@/services/team';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Key, Loader2, Eye, EyeOff, RefreshCw, Copy, Check, Users } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface TeamMemberOption {
  id: string;
  name: string;
  email: string;
}

// Generate a random password
function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function PasswordManagement() {
  const { user } = useAuth();
  const { canManageTeam } = usePermissions();
  
  // Change own password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Reset member password states
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        newPassword_confirmation: confirmPassword,
      });
      
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOpenResetDialog = async () => {
    setIsResetDialogOpen(true);
    setIsLoadingMembers(true);
    setGeneratedPassword('');
    setSelectedMemberId('');
    setResetComplete(false);
    
    try {
      const members = await teamService.getAll();
      // Filter out current user
      const otherMembers = members.filter((m: any) => m.email !== user?.email);
      setTeamMembers(otherMembers.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
      })));
    } catch (error) {
      console.error('Failed to load team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleGeneratePassword = () => {
    const password = generatePassword();
    setGeneratedPassword(password);
  };

  const handleResetMemberPassword = async () => {
    if (!selectedMemberId) {
      toast.error('Please select a team member');
      return;
    }
    
    if (!generatedPassword) {
      toast.error('Please generate a new password');
      return;
    }

    setIsResettingPassword(true);
    try {
      await authService.resetMemberPassword({
        userId: selectedMemberId,
        newPassword: generatedPassword,
      });
      
      setResetComplete(true);
      toast.success('Password reset successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCloseResetDialog = () => {
    setIsResetDialogOpen(false);
    setSelectedMemberId('');
    setGeneratedPassword('');
    setResetComplete(false);
  };

  const selectedMember = teamMembers.find(m => m.id === selectedMemberId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Password Management
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Change your password or reset team member passwords
        </p>
      </div>

      {/* Change Own Password */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Change Your Password</CardTitle>
          <CardDescription>
            Update your account password. Choose a strong password with at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleChangePassword} 
            disabled={isChangingPassword}
            className="w-full sm:w-auto"
          >
            {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Admin: Reset Team Member Password */}
      {canManageTeam && (
        <>
          <Separator />
          
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Reset Team Member Password
              </CardTitle>
              <CardDescription>
                As an admin, you can reset passwords for team members who are locked out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={handleOpenResetDialog}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Member Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Team Member Password</DialogTitle>
                    <DialogDescription>
                      Select a team member and generate a new password for them.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {resetComplete ? (
                    <div className="space-y-4 mt-4">
                      <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                        <p className="text-sm font-medium text-chart-2 mb-2">
                          Password reset successful!
                        </p>
                        <p className="text-sm text-muted-foreground">
                          The new password for <strong>{selectedMember?.name}</strong> ({selectedMember?.email}) is:
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-muted px-3 py-2 rounded border font-mono">
                          {generatedPassword}
                        </code>
                        <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                          {copiedPassword ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Please share this password securely with the team member. They should change it after logging in.
                      </p>
                      
                      <Button onClick={handleCloseResetDialog} className="w-full">
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Select Team Member</Label>
                        {isLoadingMembers ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a team member" />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name} ({member.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <div className="flex gap-2">
                          <Input
                            value={generatedPassword}
                            onChange={(e) => setGeneratedPassword(e.target.value)}
                            placeholder="Click generate or enter a password"
                            className="flex-1 font-mono"
                          />
                          <Button variant="outline" onClick={handleGeneratePassword}>
                            Generate
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          onClick={handleCloseResetDialog}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleResetMemberPassword}
                          disabled={isResettingPassword || !selectedMemberId || !generatedPassword}
                          className="flex-1"
                        >
                          {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
