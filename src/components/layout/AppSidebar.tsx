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

// In icon-only mode the rail is 3rem wide and the menu button is forced to
// size-8, so every ancestor must drop its horizontal padding for the 32px
// button (and therefore its icon) to land dead-centre in the 48px rail.
const navLinkClass =
  'flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0';

const navLabelClass = 'font-medium group-data-[collapsible=icon]:hidden';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'All Projects', url: '/projects', icon: FolderKanban },
  { title: 'All Tasks', url: '/tasks', icon: ListChecks },
  { title: 'Calendar', url: '/calendar', icon: Calendar },
  { title: 'Team', url: '/team', icon: Users },
];

const businessVerticalNavItems = [
  { title: 'EMR_Aftermarket Services', businessVertical: 'EMR_Aftermarket Services', icon: Settings2 },
  { title: 'EMR_O&M', businessVertical: 'EMR_O&M', icon: Wrench },
  { title: 'EMR_Special Projects', businessVertical: 'EMR_Special Projects', icon: Building2 },
  { title: 'EMR_Trading', businessVertical: 'EMR_Trading', icon: TrendingUp },
  { title: 'EMR_Manufacturing', businessVertical: 'EMR_Manufacturing', icon: Factory },
];

export function AppSidebar() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentBusinessVertical = searchParams.get('businessVertical');
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
                collapsed ? "h-8 w-8 p-0 justify-center" : "w-full"
              )}
              size={collapsed ? 'icon' : 'sm'}
            >
              <Plus className="w-4 h-4" />
              {!collapsed && <span className="ml-2">New Project</span>}
            </Button>
          </NavLink>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-2">
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-2 group-data-[collapsible=icon]:hidden">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/' || item.url === '/projects'}
                      className={({ isActive }) => cn(
                        navLinkClass,
                        isActive && !currentBusinessVertical && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className={navLabelClass}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-2 group-data-[collapsible=icon]:hidden">
            Business Verticals
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessVerticalNavItems.map((item) => {
                const isActive = location.pathname === '/projects' && currentBusinessVertical === item.businessVertical;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={`/projects?businessVertical=${encodeURIComponent(item.businessVertical)}`}
                        className={cn(
                          navLinkClass,
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className={navLabelClass}>{item.title}</span>
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
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <NavLink 
                  to="/settings"
                  className={({ isActive }) => cn(
                    navLinkClass,
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  <span className={navLabelClass}>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
