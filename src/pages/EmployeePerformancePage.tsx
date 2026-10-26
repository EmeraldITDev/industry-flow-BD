import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { teamService } from '@/services/team';
import { tasksService } from '@/services/tasks';
import { normalizeProject } from '@/services/projects';
import { isLost, isWon } from '@/lib/executive/analytics';
import { defaultDashboardFilters } from '@/components/dashboard/DashboardFilters';
import { projectsDrillHref } from '@/lib/dashboard/projectsDrillHref';
import type { Project, TeamMember } from '@/types';

const EMPTY_PROJECTS: Project[] = [];

function money(projects: Project[]) {
  return projects.reduce((totals, project) => ({
    ngn: totals.ngn + (project.currency === 'USD' ? 0 : Number(project.discountedContractValueNGN ?? project.contractValueNGN ?? 0)),
    usd: totals.usd + (project.currency === 'NGN' ? 0 : Number(project.discountedContractValueUSD ?? project.contractValueUSD ?? 0)),
  }), { ngn: 0, usd: 0 });
}

export default function EmployeePerformancePage() {
  const { id = '' } = useParams();
  const { canViewFinancialFields } = usePermissions();
  const memberQuery = useQuery({
    queryKey: ['team-member', id],
    queryFn: () => teamService.getById(id),
    enabled: Boolean(id),
  });
  const projectQuery = useQuery({
    queryKey: ['team-member-projects', id],
    queryFn: async () => (await teamService.getProjects(id)).map((project) => normalizeProject(project)),
    enabled: Boolean(id),
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksService.getAll({ assigneeId: id }),
    enabled: Boolean(id),
  });

  const member = memberQuery.data as TeamMember | undefined;
  const projects = projectQuery.data ?? EMPTY_PROJECTS;
  const tasks = tasksQuery.data ?? [];
  const verticals = useMemo(
    () => [...new Set(projects.map((project) => project.businessVertical).filter((vertical): vertical is string => Boolean(vertical)))],
    [projects],
  );
  const led = projects.filter((project) => String(project.projectLeadId ?? '') === id);
  const assigned = projects.filter((project) =>
    String(project.assigneeId ?? '') === id || project.projectAssignmentIds?.map(String).includes(id),
  );
  const won = projects.filter(isWon);
  const lost = projects.filter(isLost);
  const active = projects.filter((project) => project.status === 'active');
  const values = money(projects);
  const stages = [...new Set(projects.map((project) => project.pipelineStage || 'unspecified'))].sort();
  const tasksCompleted = tasks.filter((task) => task.status === 'completed').length;
  const taskHref = (targetProjects: Project[]) => {
    const query = new URLSearchParams();
    query.set('projectIds', JSON.stringify(targetProjects.map((project) => String(project.id))));
    return `/projects?${query.toString()}`;
  };
  const stageHref = (stage: string) => {
    const matchingIds = projects
      .filter((project) => (project.pipelineStage || 'unspecified') === stage)
      .map((project) => String(project.id));
    const query = new URLSearchParams({ projectIds: JSON.stringify(matchingIds) });
    return `/projects?${query.toString()}`;
  };

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header>
          <Link to="/team?tab=leads" className="text-sm text-primary hover:underline">← Team Management</Link>
          <h1 className="mt-3 text-2xl font-bold">{member?.name || 'Employee performance'}</h1>
          {member && <p className="text-sm text-muted-foreground">{member.email} · {member.department || 'Department not set'}</p>}
        </header>

        {(memberQuery.isLoading || projectQuery.isLoading || tasksQuery.isLoading) && <Skeleton className="h-40 w-full" />}
        {(memberQuery.isError || projectQuery.isError || tasksQuery.isError) && (
          <p role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
            Unable to load this employee's performance details. Refresh to try again.
          </p>
        )}
        {member && !projectQuery.isError && !tasksQuery.isError && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Projects led</CardTitle></CardHeader><CardContent>{led.length ? <a href={taskHref(led)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{led.length}</a> : led.length}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Projects assigned</CardTitle></CardHeader><CardContent>{assigned.length ? <a href={taskHref(assigned)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{assigned.length}</a> : assigned.length}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active opportunities</CardTitle></CardHeader><CardContent>{active.length ? <a href={taskHref(active)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{active.length}</a> : active.length}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Won opportunities</CardTitle></CardHeader><CardContent>{won.length ? <a href={taskHref(won)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{won.length}</a> : won.length}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lost opportunities</CardTitle></CardHeader><CardContent>{lost.length ? <a href={taskHref(lost)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{lost.length}</a> : lost.length}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Assigned tasks</CardTitle></CardHeader><CardContent className="font-semibold">{tasks.length} <span className="text-xs font-normal text-muted-foreground">({tasksCompleted} completed)</span></CardContent></Card>
            </div>

            {canViewFinancialFields && (
              <Card>
                <CardHeader><CardTitle className="text-base">Pipeline value</CardTitle></CardHeader>
                <CardContent className="text-sm font-medium">₦{values.ngn.toLocaleString()} · ${values.usd.toLocaleString()}</CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employee information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">System role / access level</p><p>{member.systemRole || member.role} / {member.accessLevel || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Position</p><p>{member.position || '—'}</p></div>
                <div className="sm:col-span-2"><p className="mb-2 text-xs text-muted-foreground">Business verticals from assigned projects</p><div className="flex flex-wrap gap-2">{verticals.map((vertical) => <Badge key={vertical} variant="outline">{vertical}</Badge>)}{verticals.length === 0 && <span className="text-sm text-muted-foreground">No business vertical association</span>}</div></div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Opportunity distribution by pipeline stage</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stages.map((stage) => {
                    const count = projects.filter((project) => (project.pipelineStage || 'unspecified') === stage).length;
                    return <div key={stage} className="flex justify-between border-b pb-2 last:border-0"><span className="capitalize">{stage.replaceAll('_', ' ')}</span>{count ? <a href={stageHref(stage)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{count}</a> : <span>{count}</span>}</div>;
                  })}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Associated opportunities</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {projects.length ? projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                      <div className="min-w-0"><p className="truncate font-medium">{project.name}</p><p className="text-xs text-muted-foreground">{project.clientName || 'No account'} · {project.businessVertical || 'No vertical'}</p></div>
                      <a href={`/projects/${project.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm text-primary hover:underline">Open</a>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No associated opportunities.</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Assigned tasks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tasks.length ? tasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0"><span className="truncate">{task.title}</span><Badge variant={task.status === 'completed' ? 'secondary' : 'outline'}>{task.status}</Badge></div>) : <p className="text-sm text-muted-foreground">No assigned tasks.</p>}
              </CardContent>
            </Card>

            {projects.length > 0 && <a className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer" href={projectsDrillHref(defaultDashboardFilters, { teamMembers: [id] }, [member])}>Open all matching projects in a new tab</a>}
          </>
        )}
      </main>
    </AppLayout>
  );
}
