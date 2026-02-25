import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';

export function QuickActions() {
  const { canCreateProjects } = usePermissions();

  const actions = [
    ...(canCreateProjects ? [{ label: 'New Project', icon: Plus, href: '/projects/new', variant: 'default' as const }] : []),
    { label: 'All Projects', icon: FolderKanban, href: '/projects', variant: 'outline' as const },
    { label: 'Team', icon: Users, href: '/team', variant: 'outline' as const },
    { label: 'Calendar', icon: Calendar, href: '/calendar', variant: 'outline' as const },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.label} variant={a.variant} size="sm" asChild className="h-8 sm:h-9 text-xs sm:text-sm">
          <Link to={a.href}>
            <a.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
            {a.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
