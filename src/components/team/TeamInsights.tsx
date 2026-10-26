import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PipelineBySalesLead, { type AccountRow } from '@/components/dashboard/PipelineBySalesLead';
import TeamOpportunityLoad from '@/components/dashboard/TeamOpportunityLoad';
import { usePermissions } from '@/hooks/usePermissions';
import { businessVerticals } from '@/data/mockData';
import { isLost, isWon } from '@/lib/executive/analytics';
import { effectiveContractNgn, effectiveContractUsd } from '@/lib/contractValue';
import { defaultDashboardFilters } from '@/components/dashboard/DashboardFilters';
import { projectsDrillHref } from '@/lib/dashboard/projectsDrillHref';
import type { Project, TeamMember } from '@/types';

type Props = {
  view: 'verticals' | 'leads' | 'performance';
  members: TeamMember[];
  projects: Project[];
};

type TeamPerson = TeamMember & {
  systemRole?: string;
  accessLevel?: string;
  position?: string;
  isActive?: boolean;
};

const stages = [
  'cold',
  'initiation',
  'qualification',
  'proposal',
  'negotiation',
  'approval',
  'execution',
  'closure',
  'lost',
];

const nameOf = (member: TeamPerson | undefined, id: string | undefined) =>
  member?.name || (id ? `Unknown member (${id})` : 'Unassigned');

const projectMemberIds = (project: Project): string[] =>
  [...new Set([
    project.projectLeadId,
    project.assigneeId,
    ...(project.projectAssignmentIds ?? []),
  ].filter((id): id is string => Boolean(id)).map(String))];

function money(projects: Project[]) {
  return projects.reduce(
    (totals, project) => ({
      ngn: totals.ngn + effectiveContractNgn(project),
      usd: totals.usd + effectiveContractUsd(project),
    }),
    { ngn: 0, usd: 0 },
  );
}

function FilterBar({
  members,
  projects,
}: {
  members: TeamPerson[];
  projects: Project[];
}) {
  const [params, setParams] = useSearchParams();
  const departments = [...new Set(members.map((member) => member.department).filter(Boolean))].sort();
  const clients = [...new Set(projects.map((project) => project.clientName?.trim()).filter(Boolean))].sort();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setParams(next, { replace: true });
  };
  const updateDate = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
      <Select value={params.get('teamVertical') ?? 'all'} onValueChange={(value) => update('teamVertical', value)}>
        <SelectTrigger aria-label="Filter by business vertical"><SelectValue placeholder="All verticals" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All verticals</SelectItem>
          {businessVerticals.map((vertical) => <SelectItem key={vertical} value={vertical}>{vertical}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={params.get('teamLead') ?? 'all'} onValueChange={(value) => update('teamLead', value)}>
        <SelectTrigger aria-label="Filter by employee"><SelectValue placeholder="All employees" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All employees</SelectItem>
          {members.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={params.get('teamDepartment') ?? 'all'} onValueChange={(value) => update('teamDepartment', value)}>
        <SelectTrigger aria-label="Filter by department"><SelectValue placeholder="All departments" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={params.get('teamStage') ?? 'all'} onValueChange={(value) => update('teamStage', value)}>
        <SelectTrigger aria-label="Filter by pipeline stage"><SelectValue placeholder="All stages" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stages</SelectItem>
          {stages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={params.get('teamStatus') ?? 'all'} onValueChange={(value) => update('teamStatus', value)}>
        <SelectTrigger aria-label="Filter by project status"><SelectValue placeholder="All statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {['active', 'on-hold', 'completed', 'inactive', 'cancelled'].map((status) => <SelectItem key={status} value={status}>{status.replace('-', ' ')}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        aria-label="Filter by client or account"
        list="team-client-options"
        placeholder="Client / account"
        value={params.get('teamClient') ?? ''}
        onChange={(event) => update('teamClient', event.target.value)}
      />
      <Input type="date" aria-label="Start date from" value={params.get('teamDateFrom') ?? ''} onChange={(event) => updateDate('teamDateFrom', event.target.value)} />
      <Input type="date" aria-label="Start date to" value={params.get('teamDateTo') ?? ''} onChange={(event) => updateDate('teamDateTo', event.target.value)} />
      <datalist id="team-client-options">
        {clients.map((client) => <option key={client} value={client} />)}
      </datalist>
    </div>
  );
}

export function TeamInsights({ view, members, projects }: Props) {
  const [params] = useSearchParams();
  const { canViewFinancialFields } = usePermissions();
  const people = members as TeamPerson[];
  const byId = useMemo(() => new Map(people.map((member) => [String(member.id), member])), [people]);

  const selectedProjects = useMemo(() => projects.filter((project) => {
    const vertical = params.get('teamVertical');
    const lead = params.get('teamLead');
    const department = params.get('teamDepartment');
    const stage = params.get('teamStage');
    const status = params.get('teamStatus');
    const client = params.get('teamClient')?.trim().toLocaleLowerCase();
    const dateFrom = params.get('teamDateFrom');
    const dateTo = params.get('teamDateTo');
    if (vertical && project.businessVertical !== vertical) return false;
    if (stage && project.pipelineStage !== stage) return false;
    if (status && project.status !== status) return false;
    if (client && !(project.clientName ?? '').toLocaleLowerCase().includes(client)) return false;
    const reportingDate = project.startDate || project.pipelineIntakeDate;
    if (dateFrom && (!reportingDate || reportingDate < dateFrom)) return false;
    if (dateTo && (!reportingDate || reportingDate > dateTo)) return false;
    const memberIds = projectMemberIds(project);
    if (lead && !memberIds.includes(lead)) return false;
    if (department && !memberIds.some((id) => byId.get(id)?.department === department)) return false;
    return true;
  }), [projects, params, byId]);

  const employeeIdsForDrill = useMemo(() => {
    const department = params.get('teamDepartment');
    const lead = params.get('teamLead');
    if (lead) return [lead];
    if (department) return people.filter((member) => member.department === department).map((member) => String(member.id));
    return undefined;
  }, [params, people]);

  const drillHref = useCallback((overrides: {
    metric?: string;
    businessVerticals?: string[];
    projectLeads?: string[];
    pipelineStages?: string[];
    statuses?: string[];
    clientNames?: string[];
    teamMembers?: string[];
    assignees?: string[];
    projectIds?: string[];
    missingProjectLead?: boolean;
    dateFrom?: string;
    dateTo?: string;
  } = {}) => {
    const vertical = params.get('teamVertical');
    const stage = params.get('teamStage');
    const status = params.get('teamStatus');
    const client = params.get('teamClient')?.trim();
    const dateFrom = params.get('teamDateFrom') || undefined;
    const dateTo = params.get('teamDateTo') || undefined;
    const employeeIds = overrides.teamMembers ?? (
      overrides.projectLeads ? undefined : employeeIdsForDrill
    );
    return projectsDrillHref(defaultDashboardFilters, {
      ...overrides,
      businessVerticals: overrides.businessVerticals ?? (vertical ? [vertical] : undefined),
      pipelineStages: overrides.pipelineStages ?? (stage ? [stage] : undefined),
      statuses: overrides.statuses ?? (status ? [status] : undefined),
      clientNames: overrides.clientNames ?? (client ? [client] : undefined),
      dateFrom: overrides.dateFrom ?? dateFrom,
      dateTo: overrides.dateTo ?? dateTo,
      teamMembers: employeeIds,
      projectLeads: overrides.projectLeads,
    }, people);
  }, [params, employeeIdsForDrill, people]);

  const verticalRows = useMemo(() => businessVerticals.map((vertical) => {
    const rows = selectedProjects.filter((project) => project.businessVertical === vertical);
    const projectLeads = new Set(rows.map((project) => project.projectLeadId).filter(Boolean).map(String));
    const contributors = new Set(rows.flatMap((project) =>
      [project.assigneeId, ...(project.projectAssignmentIds ?? [])]
        .filter((id): id is string => Boolean(id))
        .map(String)
        .filter((id) => !projectLeads.has(id)),
    ));
    const memberIds = new Set(rows.flatMap(projectMemberIds));
    return {
      vertical,
      projects: rows,
      leads: projectLeads,
      contributors,
      members: [...memberIds].map((id) => byId.get(id)).filter((member): member is TeamPerson => Boolean(member)),
    };
  }), [selectedProjects, byId]);

  const accountRows = useMemo(() => {
    const groups = new Map<string, AccountRow>();
    selectedProjects.forEach((project) => {
      const account = project.clientName?.trim() || 'Unknown';
      const ownerId = project.projectLeadId || project.assigneeId || '';
      const owner = project.salesLead?.trim() || nameOf(byId.get(String(ownerId)), ownerId);
      const key = `${account.toLocaleLowerCase()}::${owner.toLocaleLowerCase()}`;
      const current = groups.get(key);
      if (current) {
        current.totalOpportunities += 1;
        if (!current.location && project.location) current.location = project.location;
        current.projectIds?.push(String(project.id));
      } else {
        groups.set(key, {
          account,
          location: project.location || '',
          accountOwner: owner,
          totalOpportunities: 1,
          projectIds: [String(project.id)],
        });
      }
    });
    return [...groups.values()].map((row) => ({
      ...row,
      href: drillHref({ projectIds: row.projectIds }),
    }));
  }, [selectedProjects, byId, drillHref]);

  const teamLoad = useMemo(() => {
    const groups = new Map<string, {
      lead: string;
      totalDeals: number;
      won: number;
      active: number;
      id?: string;
      allIds: string[];
      wonIds: string[];
      activeIds: string[];
    }>();
    selectedProjects.forEach((project) => {
      const id = project.projectLeadId ? String(project.projectLeadId) : '';
      const lead = nameOf(byId.get(id), id || undefined);
      const key = id || '__unassigned__';
      const stats = groups.get(key) ?? {
        lead,
        totalDeals: 0,
        won: 0,
        active: 0,
        id: id || undefined,
        allIds: [],
        wonIds: [],
        activeIds: [],
      };
      stats.totalDeals += 1;
      stats.allIds.push(String(project.id));
      if (isWon(project)) {
        stats.won += 1;
        stats.wonIds.push(String(project.id));
      }
      if (project.status === 'active') {
        stats.active += 1;
        stats.activeIds.push(String(project.id));
      }
      groups.set(key, stats);
    });
    return [...groups.values()].map((row) => ({
      ...row,
      loadPercentage: row.totalDeals,
      profileHref: row.id ? `/team/${row.id}` : undefined,
      projectsHref: drillHref({ projectIds: row.allIds }),
      wonHref: drillHref({ projectIds: row.wonIds }),
      activeHref: drillHref({ projectIds: row.activeIds }),
    }));
  }, [selectedProjects, byId, drillHref]);

  const staffRows = useMemo(() => people.filter((person) => {
    if (params.get('teamDepartment') && person.department !== params.get('teamDepartment')) return false;
    if (params.get('teamLead') && String(person.id) !== params.get('teamLead')) return false;
    return selectedProjects.some((project) => projectMemberIds(project).includes(String(person.id)));
  }).map((person) => {
    const related = selectedProjects.filter((project) => projectMemberIds(project).includes(String(person.id)));
    const led = related.filter((project) => String(project.projectLeadId ?? '') === String(person.id));
    const assigned = related.filter((project) =>
      String(project.assigneeId ?? '') === String(person.id) ||
      project.projectAssignmentIds?.map(String).includes(String(person.id)),
    );
    const verticals = [...new Set(related.map((project) => project.businessVertical).filter(Boolean))];
    return {
      person,
      related,
      led,
      assigned,
      verticals,
      active: related.filter((project) => project.status === 'active').length,
      won: related.filter(isWon).length,
      lost: related.filter(isLost).length,
      values: money(related),
    };
  }), [people, selectedProjects, params]);

  const unassigned = selectedProjects.filter((project) =>
    !project.projectLeadId && !project.assigneeId && !(project.projectAssignmentIds?.length),
  );
  const totalValues = money(selectedProjects);

  const projectCountLink = (count: number, href: string) => (
    count > 0 ? <Link
      to={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary underline-offset-2 hover:underline"
    >{count}<ArrowUpRight className="ml-1 inline h-3 w-3" /></Link> : <span>{count}</span>
  );

  return (
    <div className="space-y-5">
      <FilterBar members={people} projects={projects} />
      {view === 'verticals' && (
        <div className="grid gap-4 xl:grid-cols-2">
          {verticalRows.map(({ vertical, projects: rows, leads, contributors, members: verticalMembers }) => {
            const totals = money(rows);
            return (
              <Card key={vertical}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{vertical}</CardTitle>
                    {projectCountLink(rows.length, drillHref({ businessVerticals: [vertical] }))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div><span className="text-muted-foreground">Team members</span><p className="font-semibold">{verticalMembers.length}</p></div>
                    <div><span className="text-muted-foreground">Project leads</span><p className="font-semibold">{leads.size}</p></div>
                    <div><span className="text-muted-foreground">Contributors</span><p className="font-semibold">{contributors.size}</p></div>
                    <div><span className="text-muted-foreground">Active / Won</span><p className="font-semibold">{rows.filter((project) => project.status === 'active').length} / {rows.filter(isWon).length}</p></div>
                  </div>
                  {canViewFinancialFields && (
                    <p className="text-xs text-muted-foreground">
                      Pipeline: ₦{totals.ngn.toLocaleString()} · ${totals.usd.toLocaleString()}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {verticalMembers.length ? (
                    <table className="w-full min-w-[540px] text-left text-sm">
                      <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2">Employee</th><th>Project role</th><th>Projects</th><th>Active</th><th>Won</th></tr></thead>
                      <tbody>
                        {verticalMembers.sort((a, b) => a.name.localeCompare(b.name)).map((member) => {
                          const related = rows.filter((project) => projectMemberIds(project).includes(String(member.id)));
                          const roles = [
                            related.some((project) => String(project.projectLeadId ?? '') === String(member.id)) ? 'Project Lead' : '',
                            related.some((project) => String(project.assigneeId ?? '') === String(member.id) || project.projectAssignmentIds?.map(String).includes(String(member.id))) ? 'Assigned Contributor' : '',
                          ].filter(Boolean);
                          return (
                            <tr key={member.id} className="border-b last:border-0">
                              <td className="py-2"><a className="font-medium text-primary hover:underline" target="_blank" rel="noopener noreferrer" href={`/team/${member.id}`}>{member.name}</a></td>
                              <td><div className="flex flex-wrap gap-1">{roles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>)}</div></td>
                              <td>{projectCountLink(related.length, drillHref({ businessVerticals: [vertical], teamMembers: [String(member.id)] }))}</td>
                              <td>{related.filter((project) => project.status === 'active').length}</td>
                              <td>{related.filter(isWon).length}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : <p className="text-sm text-muted-foreground">No team members linked to projects in this vertical.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {view === 'leads' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Leads & Contributors</CardTitle>
            <p className="text-sm text-muted-foreground">
              Account Manager is not a separate project relationship in the current schema. Sales Lead remains free text and is not treated as a verified employee assignment.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2">Employee</th><th>Department</th><th>Role / access</th><th>Business verticals</th><th>Led</th><th>Assigned</th><th>Active</th><th>Won</th><th>Lost</th>{canViewFinancialFields && <th>Pipeline value</th>}</tr></thead>
              <tbody>
                {staffRows.map(({ person, led, assigned, verticals, active, won, lost, values }) => (
                  <tr key={person.id} className="border-b last:border-0">
                    <td className="py-2"><a className="font-medium text-primary hover:underline" target="_blank" rel="noopener noreferrer" href={`/team/${person.id}`}>{person.name}</a></td>
                    <td>{person.department || '—'}</td>
                    <td>{person.systemRole || person.role}{person.accessLevel ? ` / ${person.accessLevel}` : ''}</td>
                    <td><div className="flex flex-wrap gap-1">{verticals.map((vertical) => <Badge key={vertical} variant="outline">{vertical}</Badge>)}</div></td>
                    <td>{projectCountLink(led.length, drillHref({ projectLeads: [String(person.id)] }))}</td>
                    <td>{assigned.length ? projectCountLink(assigned.length, drillHref({ projectIds: assigned.map((project) => String(project.id)) })) : assigned.length}</td><td>{active}</td><td>{won}</td><td>{lost}</td>
                    {canViewFinancialFields && <td>₦{values.ngn.toLocaleString()} · ${values.usd.toLocaleString()}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {!staffRows.length && <p className="py-5 text-sm text-muted-foreground">No employees match the current filters.</p>}
          </CardContent>
        </Card>
      )}

      {view === 'performance' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Opportunities</CardTitle></CardHeader><CardContent>{projectCountLink(selectedProjects.length, drillHref())}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Unassigned</CardTitle></CardHeader><CardContent>{unassigned.length ? projectCountLink(unassigned.length, drillHref({ projectIds: unassigned.map((project) => String(project.id)) })) : unassigned.length}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent>{projectCountLink(selectedProjects.filter((project) => project.status === 'active').length, drillHref({ statuses: ['active'] }))}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Won</CardTitle></CardHeader><CardContent>{projectCountLink(selectedProjects.filter(isWon).length, drillHref({ pipelineStages: ['won'] }))}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lost</CardTitle></CardHeader><CardContent>{projectCountLink(selectedProjects.filter(isLost).length, drillHref({ pipelineStages: ['lost'] }))}</CardContent></Card>
            {canViewFinancialFields && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline value</CardTitle></CardHeader><CardContent className="text-sm font-medium">₦{totalValues.ngn.toLocaleString()} · ${totalValues.usd.toLocaleString()}</CardContent></Card>}
          </div>
          {unassigned.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Unassigned opportunities</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {unassigned.slice(0, 10).map((project) => <div key={project.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0"><span className="truncate">{project.name}</span><a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" href={drillHref({ projectIds: [String(project.id)] })}>View opportunity</a></div>)}
              </CardContent>
            </Card>
          )}
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <PipelineBySalesLead data={accountRows} />
            <TeamOpportunityLoad data={teamLoad} />
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Opportunity distribution by vertical</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {verticalRows.map(({ vertical, projects: rows }) => (
                <div key={vertical} className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm">{vertical}</span>
                  {projectCountLink(rows.length, drillHref({ businessVerticals: [vertical] }))}
                </div>
              ))}
            </CardContent>
          </Card>
          {canViewFinancialFields && (
            <Card>
              <CardHeader><CardTitle className="text-base">Pipeline value by project lead</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {teamLoad.map((row) => {
                  const related = selectedProjects.filter((project) =>
                    row.id ? String(project.projectLeadId ?? '') === row.id : !project.projectLeadId,
                  );
                  const values = money(related);
                  return <div key={row.id ?? 'unassigned'} className="rounded-md border p-3"><p className="font-medium">{row.lead}</p><p className="text-xs text-muted-foreground">₦{values.ngn.toLocaleString()} · ${values.usd.toLocaleString()}</p></div>;
                })}
              </CardContent>
            </Card>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => window.open('/projects', '_blank', 'noopener,noreferrer')}>Open all projects in new tab</Button>
          </div>
        </>
      )}
    </div>
  );
}
