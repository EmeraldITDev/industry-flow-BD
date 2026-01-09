import { 
  LayoutDashboard, 
  FolderKanban, 
  Factory, 
  Zap, 
  Fuel, 
  TrendingUp,
  Settings,
  Users,
  Calendar,
  Plus
} from 'lucide-react';
import emeraldLogo from '@/assets/emerald-logo.png';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'All Projects', url: '/projects', icon: FolderKanban },
  { title: 'Calendar', url: '/calendar', icon: Calendar },
  { title: 'Team', url: '/team', icon: Users },
];

const sectorNavItems = [
  { title: 'Manufacturing', sector: 'Manufacturing', icon: Factory },
  { title: 'Energy', sector: 'Energy', icon: Zap },
  { title: 'Oil and Gas', sector: 'Oil and Gas', icon: Fuel },
  { title: 'Commodity Trading', sector: 'Commodity Trading', icon: TrendingUp },
];

export function AppSidebar() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentSector = searchParams.get('sector');
  const { canCreateProjects, canManageSettings } = usePermissions();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <img src={emeraldLogo} alt="Emerald PM" className="h-10 w-auto" />
        </div>
        {canCreateProjects && (
          <NavLink to="/projects/new">
            <Button className="w-full" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </NavLink>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/' || item.url === '/projects'}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                        isActive && !currentSector && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-2">
            Sectors
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sectorNavItems.map((item) => {
                const isActive = location.pathname === '/projects' && currentSector === item.sector;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={`/projects?sector=${item.sector}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {canManageSettings && (
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/settings"
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
