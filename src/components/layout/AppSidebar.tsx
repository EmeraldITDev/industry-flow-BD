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
const navLinkClass = (collapsed: boolean) =>
  cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground',
    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
    collapsed && 'justify-center gap-0 px-0'
  );

const navLabelClass = (collapsed: boolean) =>
  cn('font-medium', collapsed ? 'hidden' : 'inline');

function isMainNavActive(
  url: string,
  pathname: string,
  businessVertical: string | null
): boolean {
  if (businessVertical) return false;
  if (url === '/') return pathname === '/';
  if (url === '/projects') return pathname === '/projects';
  return pathname === url || pathname.startsWith(`${url}/`);
}

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
            alt="Emerald BDPortal"
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

      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0">
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel
            className={cn(
              'text-xs font-medium px-2 py-2 text-sidebar-foreground/70',
              collapsed && 'hidden'
            )}
          >
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const active = isMainNavActive(
                  item.url,
                  location.pathname,
                  currentBusinessVertical
                );
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/' || item.url === '/projects'}
                        className={cn(
                          navLinkClass(collapsed),
                          active && 'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={navLabelClass(collapsed)}>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel
            className={cn(
              'text-xs font-medium px-2 py-2 text-sidebar-foreground/70',
              collapsed && 'hidden'
            )}
          >
            Business Verticals
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessVerticalNavItems.map((item) => {
                const active =
                  location.pathname === '/projects' &&
                  currentBusinessVertical === item.businessVertical;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={`/projects?businessVertical=${encodeURIComponent(item.businessVertical)}`}
                        className={cn(
                          navLinkClass(collapsed),
                          active && 'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={navLabelClass(collapsed)}>{item.title}</span>
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
              <SidebarMenuButton
                asChild
                isActive={location.pathname === '/settings'}
                tooltip="Settings"
              >
                <NavLink
                  to="/settings"
                  className={cn(
                    navLinkClass(collapsed),
                    location.pathname === '/settings' &&
                      'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                  )}
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  <span className={navLabelClass(collapsed)}>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
