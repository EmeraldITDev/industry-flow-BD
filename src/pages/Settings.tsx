import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { useColorTheme, ColorTheme } from '@/context/ColorThemeContext';
import { AccessLevelManager } from '@/components/settings/AccessLevelManager';
import { PasswordManagement } from '@/components/settings/PasswordManagement';
import { ACCESS_LEVEL_CONFIG } from '@/types/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Palette,
  Crown,
  Briefcase,
  ClipboardList,
  Eye,
  Moon,
  Sun,
  Check,
  Key
} from 'lucide-react';
import { toast } from 'sonner';

const roleIcons = {
  admin: Crown,
  bd_director: Briefcase,
  employee: ClipboardList,
  project_manager: ClipboardList,
};

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [notifications, setNotifications] = useState(true);
  
  const isDarkMode = theme === 'dark';
  
  const handleDarkModeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleColorThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme);
    toast.success(`Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
  };

  const themeOptions: { id: ColorTheme; name: string; color: string }[] = [
    { id: 'emerald', name: 'Emerald', color: 'bg-[hsl(196,73%,26%)]' },
    { id: 'ocean', name: 'Ocean', color: 'bg-[hsl(210,70%,35%)]' },
    { id: 'turquoise', name: 'Turquoise', color: 'bg-[hsl(177,48%,45%)]' },
    { id: 'purple', name: 'Purple', color: 'bg-[hsl(270,60%,45%)]' },
    { id: 'amber', name: 'Amber', color: 'bg-[hsl(35,85%,45%)]' },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const RoleIcon = user ? roleIcons[user.accessLevel] : User;
  const roleConfig = user ? ACCESS_LEVEL_CONFIG[user.accessLevel] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20">
            <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>
        </div>

        {/* User Profile Card */}
        <Card className="border-border/50 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {user ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-xl font-semibold">{user?.name}</h2>
                  {roleConfig && (
                    <Badge variant="outline" className={`gap-1.5 ${roleConfig.color}`}>
                      <RoleIcon className="h-3 w-3" />
                      {roleConfig.label}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="access" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid h-auto p-0.5 sm:p-1 bg-muted/50">
            <TabsTrigger value="access" className="gap-1 sm:gap-2 data-[state=active]:bg-background py-2 sm:py-2.5 px-1 sm:px-3">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Access</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1 sm:gap-2 data-[state=active]:bg-background py-2 sm:py-2.5 px-1 sm:px-3">
              <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Password</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 sm:gap-2 data-[state=active]:bg-background py-2 sm:py-2.5 px-1 sm:px-3">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1 sm:gap-2 data-[state=active]:bg-background py-2 sm:py-2.5 px-1 sm:px-3">
              <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Appearance</span>
            </TabsTrigger>
          </TabsList>

          {/* Access Management Tab */}
          <TabsContent value="access" className="mt-6 animate-fade-in">
            <AccessLevelManager />
          </TabsContent>

          {/* Password Management Tab */}
          <TabsContent value="password" className="mt-6 animate-fade-in">
            <PasswordManagement />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6 animate-fade-in">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure how and when you receive notifications
                </p>
              </div>

              <Card className="border-border/50">
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email alerts for important updates
                      </p>
                    </div>
                    <Switch checked={notifications} onCheckedChange={setNotifications} />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="text-base">Notify me about</Label>
                    <div className="space-y-3">
                      {[
                        { label: 'Project assignments', description: 'When you are assigned to a new project' },
                        { label: 'Due date changes', description: 'When project deadlines are modified' },
                        { label: 'Task updates', description: 'When tasks you own are updated' },
                        { label: 'Stage transitions', description: 'When projects move to a new stage' },
                        { label: 'Team changes', description: 'When team members are added or removed' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm font-medium">{item.label}</span>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-6 animate-fade-in">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Appearance
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Customize the look and feel of Emerald PM
                </p>
              </div>

              <Card className="border-border/50">
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      <div className="space-y-0.5">
                        <Label className="text-base">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Toggle between light and dark themes
                        </p>
                      </div>
                    </div>
                    <Switch checked={isDarkMode} onCheckedChange={handleDarkModeChange} />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-base">Theme Colors</Label>
                    <div className="flex flex-wrap gap-3">
                      {themeOptions.map((themeOption) => (
                        <button
                          key={themeOption.id}
                          onClick={() => handleColorThemeChange(themeOption.id)}
                          className={`relative h-10 w-10 rounded-full ${themeOption.color} ring-2 ring-offset-2 ring-offset-background transition-all ${
                            colorTheme === themeOption.id 
                              ? 'ring-foreground' 
                              : 'ring-transparent hover:ring-muted-foreground'
                          }`}
                          title={themeOption.name}
                        >
                          {colorTheme === themeOption.id && (
                            <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select a color theme for the application
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
