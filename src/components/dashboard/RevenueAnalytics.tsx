import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { Project, PipelineStage, TeamMember } from '@/types';
import { DollarSign, Users, Building2, Layers, Banknote } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

type RevenueFilter = 'all' | 'pending' | 'proposal' | 'won';

const stageToFilter: Record<PipelineStage, RevenueFilter> = {
  initiation: 'pending',
  qualification: 'pending',
  proposal: 'proposal',
  negotiation: 'proposal',
  approval: 'won',
  execution: 'won',
  closure: 'won',
};

const filterLabels: Record<RevenueFilter, string> = {
  all: 'All Projects',
  pending: 'Pending',
  proposal: 'In Proposal',
  won: 'Won',
};

export const RevenueAnalytics = () => {
  const [filter, setFilter] = useState<RevenueFilter>('all');
  const { currency, formatCurrency: formatCurrencyValue, getContractValue, getMarginValue } = useCurrency();

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
    return allProjects.filter((p: Project) => stageToFilter[p.pipelineStage] === filter);
  }, [projects, filter]);

  const revenueByProject = useMemo(() => {
    return filteredProjects.map((p: Project) => ({
      id: p.id,
      name: p.name,
      client: p.clientName || 'N/A',
      sector: p.sector,
      segment: p.businessSegment || 'N/A',
      stage: p.pipelineStage,
      revenue: getContractValue(p),
      margin: getMarginValue(p),
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency, getContractValue, getMarginValue]);

  const revenueByTeamMember = useMemo(() => {
    const memberRevenue: Record<string, { name: string; revenue: number; projects: number; margin: number }> = {};
    
    filteredProjects.forEach((p: Project) => {
      const leadId = p.projectLeadId;
      if (leadId) {
        const member = getTeamMemberById(leadId);
        if (member) {
          if (!memberRevenue[leadId]) {
            memberRevenue[leadId] = { name: member.name, revenue: 0, projects: 0, margin: 0 };
          }
          memberRevenue[leadId].revenue += getContractValue(p);
          memberRevenue[leadId].margin += getMarginValue(p);
          memberRevenue[leadId].projects += 1;
        }
      }
    });
    
    return Object.values(memberRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency, teamMembers, getContractValue, getMarginValue]);

  const revenueByCustomer = useMemo(() => {
    const customerRevenue: Record<string, { name: string; revenue: number; projects: number; margin: number }> = {};
    
    filteredProjects.forEach((p: Project) => {
      const client = p.clientName || 'Unknown';
      if (!customerRevenue[client]) {
        customerRevenue[client] = { name: client, revenue: 0, projects: 0, margin: 0 };
      }
      customerRevenue[client].revenue += currency === 'NGN' ? (p.contractValueNGN || 0) : (p.contractValueUSD || 0);
      customerRevenue[client].margin += currency === 'NGN' ? (p.marginValueNGN || 0) : (p.marginValueUSD || 0);
      customerRevenue[client].projects += 1;
    });
    
    return Object.values(customerRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency, getContractValue, getMarginValue]);

  const revenueBySegment = useMemo(() => {
    const segmentRevenue: Record<string, { name: string; revenue: number; projects: number; margin: number }> = {};
    
    filteredProjects.forEach((p: Project) => {
      const segment = p.businessSegment || 'Unassigned';
      if (!segmentRevenue[segment]) {
        segmentRevenue[segment] = { name: segment, revenue: 0, projects: 0, margin: 0 };
      }
      segmentRevenue[segment].revenue += getContractValue(p);
      segmentRevenue[segment].margin += getMarginValue(p);
      segmentRevenue[segment].projects += 1;
    });
    
    return Object.values(segmentRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency, getContractValue, getMarginValue]);

  const totalRevenue = useMemo(() => {
    return filteredProjects.reduce((sum: number, p: Project) => 
      sum + getContractValue(p), 0
    );
  }, [filteredProjects, currency, getContractValue]);

  if (projectsLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Revenue Analytics</CardTitle>
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
        <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Revenue Analytics</CardTitle>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          {(Object.keys(filterLabels) as RevenueFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
            >
              {filterLabels[f]}
            </Button>
          ))}
        </div>

        {/* Total Revenue Display */}
        <div className="mt-3 sm:mt-4 p-2.5 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-[10px] sm:text-sm text-muted-foreground">Total Revenue ({filterLabels[filter]})</p>
          <p className="text-lg sm:text-2xl font-bold text-primary">{formatCurrencyValue(totalRevenue)}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground">{filteredProjects.length} projects</p>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {hasNoData ? (
          <div className="text-center py-8">
            <Banknote className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No revenue data yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create projects to see revenue analytics</p>
          </div>
        ) : (
          <Tabs defaultValue="project" className="w-full">
            <TabsList className="grid grid-cols-4 mb-3 sm:mb-4 h-auto p-0.5 sm:p-1">
              <TabsTrigger value="project" className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3">
                <DollarSign className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline truncate">By Project</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3">
                <Users className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline truncate">By Team</span>
              </TabsTrigger>
              <TabsTrigger value="customer" className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline truncate">By Customer</span>
              </TabsTrigger>
              <TabsTrigger value="segment" className="flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1.5 sm:py-2 px-1 sm:px-3">
                <Layers className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline truncate">By Segment</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="project" className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
              {revenueByProject.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2">{item.sector}</Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{item.client}</span>
                    </div>
                  </div>
                  <div className="text-right ml-2 sm:ml-4 shrink-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground">{formatCurrencyValue(item.revenue)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">M: {formatCurrencyValue(item.margin)}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="team" className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
              {revenueByTeamMember.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">No team revenue data</div>
              ) : (
                revenueByTeamMember.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{item.projects} project(s)</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-xs sm:text-sm text-foreground">{formatCurrencyValue(item.revenue)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">M: {formatCurrencyValue(item.margin)}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="customer" className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
              {revenueByCustomer.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{item.projects} project(s)</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground">{formatCurrencyValue(item.revenue)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">M: {formatCurrencyValue(item.margin)}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="segment" className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
              {revenueBySegment.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{item.projects} project(s)</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground">{formatCurrencyValue(item.revenue)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">M: {formatCurrencyValue(item.margin)}</p>
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
