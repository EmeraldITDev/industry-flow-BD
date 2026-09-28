import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { Project, PIPELINE_STAGES, TeamMember } from '@/types';
import { DollarSign, Users, Building2, Layers, Banknote } from 'lucide-react';
import { formatOrDash, useCurrency } from '@/context/CurrencyContext';
import { useDashboardCurrencyFormat } from '@/hooks/useDashboardCurrencyFormat';
import { isWon } from '@/lib/executive/analytics';

/** 'all' | canonical pipeline_stage | composite 'won' (same definition as Dashboard KPIs). */
type RevenueFilter = 'all' | 'won' | (typeof PIPELINE_STAGES)[number]['value'];

const STAGE_TABS: { key: RevenueFilter; label: string }[] = [
  { key: 'all', label: 'All Projects' },
  ...PIPELINE_STAGES.map((s) => ({
    key: s.value as RevenueFilter,
    label: s.label === 'Approval / Won' ? 'Approval' : s.label,
  })),
  { key: 'won', label: 'Won' },
];

export const RevenueAnalytics = () => {
  const [filter, setFilter] = useState<RevenueFilter>('all');
  const { currency, getContractValue, getMarginValue } = useCurrency();
  const { formatCurrency: formatCurrencyValue } = useDashboardCurrencyFormat();
  const currencyLabel = currency === 'NGN' ? 'NGN' : 'USD';

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const getTeamMemberById = (id: string): TeamMember | undefined => {
    return (teamMembers || []).find((m: TeamMember) => m.id === id);
  };

  const filteredProjects = useMemo(() => {
    const allProjects = projects || [];
    if (filter === 'all') return allProjects;
    if (filter === 'won') return allProjects.filter((p: Project) => isWon(p));
    return allProjects.filter((p: Project) => {
      const stage = (p.pipelineStage || 'cold').toLowerCase().trim();
      return stage === filter;
    });
  }, [projects, filter]);

  const filterLabel =
    STAGE_TABS.find((t) => t.key === filter)?.label ?? filter;

  const missingCurrencyCount = useMemo(
    () => filteredProjects.filter((p) => getContractValue(p) == null).length,
    [filteredProjects, getContractValue]
  );

  const revenueByProject = useMemo(() => {
    return filteredProjects
      .map((p: Project) => {
        const revenue = getContractValue(p);
        const margin = getMarginValue(p);
        return {
          id: p.id,
          name: p.name,
          client: p.clientName || 'N/A',
          sector: p.sector,
          segment: p.businessSegment || 'N/A',
          stage: p.pipelineStage,
          revenue,
          margin,
          sortKey: revenue ?? -1,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [filteredProjects, getContractValue, getMarginValue]);

  const revenueByTeamMember = useMemo(() => {
    const memberRevenue: Record<
      string,
      { name: string; revenue: number; projects: number; margin: number }
    > = {};

    filteredProjects.forEach((p: Project) => {
      const leadId = p.projectLeadId;
      if (!leadId) return;
      const member = getTeamMemberById(leadId);
      if (!member) return;
      const revenue = getContractValue(p);
      if (revenue == null) return;
      if (!memberRevenue[leadId]) {
        memberRevenue[leadId] = { name: member.name, revenue: 0, projects: 0, margin: 0 };
      }
      memberRevenue[leadId].revenue += revenue;
      memberRevenue[leadId].margin += getMarginValue(p) ?? 0;
      memberRevenue[leadId].projects += 1;
    });

    return Object.values(memberRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, teamMembers, getContractValue, getMarginValue]);

  const revenueByCustomer = useMemo(() => {
    const customerRevenue: Record<
      string,
      { name: string; revenue: number; projects: number; margin: number }
    > = {};

    filteredProjects.forEach((p: Project) => {
      const revenue = getContractValue(p);
      if (revenue == null) return;
      const client = p.clientName || 'Unknown';
      if (!customerRevenue[client]) {
        customerRevenue[client] = { name: client, revenue: 0, projects: 0, margin: 0 };
      }
      customerRevenue[client].revenue += revenue;
      customerRevenue[client].margin += getMarginValue(p) ?? 0;
      customerRevenue[client].projects += 1;
    });

    return Object.values(customerRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, getContractValue, getMarginValue]);

  const revenueBySegment = useMemo(() => {
    const segmentRevenue: Record<
      string,
      { name: string; revenue: number; projects: number; margin: number }
    > = {};

    filteredProjects.forEach((p: Project) => {
      const revenue = getContractValue(p);
      if (revenue == null) return;
      const segment = p.businessSegment || 'Unassigned';
      if (!segmentRevenue[segment]) {
        segmentRevenue[segment] = { name: segment, revenue: 0, projects: 0, margin: 0 };
      }
      segmentRevenue[segment].revenue += revenue;
      segmentRevenue[segment].margin += getMarginValue(p) ?? 0;
      segmentRevenue[segment].projects += 1;
    });

    return Object.values(segmentRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, getContractValue, getMarginValue]);

  const totalRevenue = useMemo(() => {
    return filteredProjects.reduce((sum: number, p: Project) => {
      const v = getContractValue(p);
      return v == null ? sum : sum + v;
    }, 0);
  }, [filteredProjects, getContractValue]);

  if (projectsLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
            Revenue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasNoData = filteredProjects.length === 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
          Revenue Analytics
        </CardTitle>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          {STAGE_TABS.map((t) => (
            <Button
              key={t.key}
              variant={filter === t.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(t.key)}
              className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="mt-3 sm:mt-4 p-2.5 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-[10px] sm:text-sm text-muted-foreground">
            Total Revenue ({filterLabel}) · {currencyLabel}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-primary">
            {formatCurrencyValue(totalRevenue)}
          </p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">
            {filteredProjects.length - missingCurrencyCount} of {filteredProjects.length}{' '}
            projects with {currencyLabel}
          </p>
          {missingCurrencyCount > 0 && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {missingCurrencyCount} project
              {missingCurrencyCount === 1 ? '' : 's'} have no {currencyLabel} value and are
              excluded
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {hasNoData ? (
          <div className="text-center py-8">
            <Banknote className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No revenue data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'all'
                ? 'Create projects to see revenue analytics'
                : `No projects in ${filterLabel}`}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="project" className="w-full">
            <TabsList className="grid grid-cols-4 mb-3 sm:mb-4 h-auto p-0.5 sm:p-1">
              <TabsTrigger
                value="project"
                className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3"
              >
                <DollarSign className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">By Project</span>
                <span className="sm:hidden">Project</span>
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3"
              >
                <Users className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">By Team</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
              <TabsTrigger
                value="customer"
                className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3"
              >
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">By Customer</span>
                <span className="sm:hidden">Customer</span>
              </TabsTrigger>
              <TabsTrigger
                value="segment"
                className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3"
              >
                <Layers className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">By Segment</span>
                <span className="sm:hidden">Segment</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="project" className="space-y-2 max-h-80 overflow-y-auto">
              {revenueByProject.map((item) => (
                <Link
                  key={item.id}
                  to={`/projects/${item.id}`}
                  className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {item.client}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground">
                      {formatOrDash(item.revenue, formatCurrencyValue)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      M: {formatOrDash(item.margin, formatCurrencyValue)}
                    </p>
                  </div>
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="team" className="space-y-2 max-h-80 overflow-y-auto">
              {revenueByTeamMember.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {item.projects} project{item.projects === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground">
                      {formatCurrencyValue(item.revenue)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      M: {formatCurrencyValue(item.margin)}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="customer" className="space-y-2 max-h-80 overflow-y-auto">
              {revenueByCustomer.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      {item.projects} opp{item.projects === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground">
                      {formatCurrencyValue(item.revenue)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      M: {formatCurrencyValue(item.margin)}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="segment" className="space-y-2 max-h-80 overflow-y-auto">
              {revenueBySegment.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {item.projects} project{item.projects === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground">
                      {formatCurrencyValue(item.revenue)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      M: {formatCurrencyValue(item.margin)}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
