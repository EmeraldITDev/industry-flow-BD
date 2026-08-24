import { 
  LayoutDashboard, 
  FolderKanban, 
  Factory, 
  Wrench,
  Settings2,
  TrendingUp,
  Settings,
  Users,
  Calendar,
  Plus,
  Building2,
  ListChecks
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'All Projects', url: '/projects', icon: FolderKanban },
  { title: 'All Tasks', url: '/tasks', icon: ListChecks },
  { title: 'Calendar', url: '/calendar', icon: Calendar },
  { title: 'Team', url: '/team', icon: Users },
];

const sectorNavItems = [
  { title: 'EMR_Aftermarket Services', sector: 'EMR_Aftermarket Services', icon: Settings2 },
  { title: 'EMR_O&M', sector: 'EMR_O&M', icon: Wrench },
  { title: 'EMR_Special Projects', sector: 'EMR_Special Projects', icon: Building2 },
  { title: 'EMR_Trading', sector: 'EMR_Trading', icon: TrendingUp },
  { title: 'EMR_Manufacturing', sector: 'EMR_Manufacturing', icon: Factory },
];

export function AppSidebar() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentSector = searchParams.get('sector');
  const { canCreateProjects, canManageSettings } = usePermissions();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className={cn("border-b border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        <NavLink to="/" className="flex items-center justify-center gap-3 mb-3">
          <img
            src={collapsed ? '/favicon.png' : emeraldLogo}
            alt="Emerald PM"
            className={collapsed ? 'h-8 w-8' : 'h-10 w-auto'}
          />
        </NavLink>
        {canCreateProjects && (
          <NavLink
            to="/projects/new"
            title="New Project"
            className={cn("flex", collapsed ? "justify-center" : "w-full")}
          >
            <Button
              className={cn(
                collapsed ? "h-9 w-9 p-0 justify-center" : "w-full"
              )}
              size={collapsed ? 'icon' : 'sm'}
            >
              <Plus className="w-4 h-4" />
              {!collapsed && <span className="ml-2">New Project</span>}
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
                        to={`/projects?sector=${encodeURIComponent(item.sector)}`}
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
