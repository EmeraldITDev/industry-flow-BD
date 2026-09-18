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
  ListChecks,
  Landmark,
  FileStack,
  Handshake,
} from 'lucide-react';
import emeraldLogo from '@/assets/emerald-logo.png';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';
import { canViewExecutive, isRestrictedExecutiveUser, homePathForUser } from '@/lib/executive/access';
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

// Icon rail is 3rem (48px). SidebarMenuButton becomes size-8 (32px) with
// group-data-[collapsible=icon]:!size-8. SidebarGroup's default p-2 supplies
// the 8px side gutters (8+32+8=48) that center each button in the rail —
// do not zero group padding in icon mode or buttons hug the left edge.
const navLinkClass = (collapsed: boolean) =>
  cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2',
    // Light mode: primary blue (matches Business Verticals / brand). Dark: sidebar tokens.
    'text-primary dark:text-sidebar-foreground',
    'hover:bg-primary/10 hover:text-primary dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground',
    'transition-colors',
    collapsed && 'justify-center gap-0 px-0'
  );

const groupLabelClass = (collapsed: boolean) =>
  cn(
    'text-xs font-medium px-2 py-2 text-primary/80 dark:text-sidebar-foreground/70',
    collapsed && 'hidden'
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
  { title: 'Document Repository', url: '/document-repository', icon: FileStack },
];

const businessVerticalNavItems = [
  { title: 'EMR_Aftermarket Services', businessVertical: 'EMR_Aftermarket Services', icon: Settings2 },
  { title: 'EMR_O&M', businessVertical: 'EMR_O&M', icon: Wrench },
  { title: 'EMR_Special Projects', businessVertical: 'EMR_Special Projects', icon: Building2 },
  { title: 'EMR_Trading', businessVertical: 'EMR_Trading', icon: TrendingUp },
  { title: 'EMR_Manufacturing', businessVertical: 'EMR_Manufacturing', icon: Factory },
];

const partnersNavItems = [
  { title: 'Partner Tracker', url: '/partners', icon: Handshake },
];

/** Restricted main nav for lazarus.angbazo@emeraldcfze.com — no All Tasks. */
const restrictedExecutiveNavItems = [
  { title: "Chairman's View", url: '/executive', icon: Landmark },
  { title: 'Dashboard', url: '/operations', icon: LayoutDashboard },
  { title: 'All Projects', url: '/projects', icon: FolderKanban },
  { title: 'Calendar', url: '/calendar', icon: Calendar },
  { title: 'Team', url: '/team', icon: Users },
  { title: 'Document Repository', url: '/document-repository', icon: FileStack },
];

export function AppSidebar() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentBusinessVertical = searchParams.get('businessVertical');
  const { user } = useAuth();
  const { canCreateProjects, canManageSettings } = usePermissions();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isRestrictedExecutive = isRestrictedExecutiveUser(user);
  const showExecutiveNav = canViewExecutive(user);
  const homeUrl = homePathForUser(user);

  const navItems = isRestrictedExecutive
    ? restrictedExecutiveNavItems
    : showExecutiveNav
      ? [
          { title: "Chairman's View", url: '/executive', icon: Landmark },
          ...mainNavItems,
        ]
      : mainNavItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className={cn("border-b border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        <NavLink to={homeUrl} className="flex items-center justify-center gap-3 mb-3">
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

      {/* Drop content padding in icon mode so only SidebarGroup's p-2 remains
          and centers the 32px buttons in the 48px rail. */}
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarGroupLabel className={groupLabelClass(collapsed)}>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
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

        <SidebarGroup>
          <SidebarGroupLabel className={groupLabelClass(collapsed)}>
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

        <SidebarGroup>
          <SidebarGroupLabel className={groupLabelClass(collapsed)}>
            Partners
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {partnersNavItems.map((item) => {
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

      {canManageSettings && !isRestrictedExecutive && (
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
