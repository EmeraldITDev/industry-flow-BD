import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projects, teamMembers, getTeamMemberById, sectors, businessSegments } from '@/data/mockData';
import { PipelineStage } from '@/types';
import { DollarSign, Users, Building2, Layers } from 'lucide-react';

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
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('USD');

  const filteredProjects = useMemo(() => {
    if (filter === 'all') return projects;
    return projects.filter(p => stageToFilter[p.pipelineStage] === filter);
  }, [filter]);

  const revenueByProject = useMemo(() => {
    return filteredProjects.map(p => ({
      id: p.id,
      name: p.name,
      client: p.clientName || 'N/A',
      sector: p.sector,
      segment: p.businessSegment || 'N/A',
      stage: p.pipelineStage,
      revenue: currency === 'NGN' ? (p.contractValueNGN || 0) : (p.contractValueUSD || 0),
      margin: currency === 'NGN' ? (p.marginValueNGN || 0) : (p.marginValueUSD || 0),
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency]);

  const revenueByTeamMember = useMemo(() => {
    const memberRevenue: Record<string, { name: string; revenue: number; projects: number; margin: number }> = {};
    
    filteredProjects.forEach(p => {
      const leadId = p.projectLeadId;
      if (leadId) {
        const member = getTeamMemberById(leadId);
        if (member) {
          if (!memberRevenue[leadId]) {
            memberRevenue[leadId] = { name: member.name, revenue: 0, projects: 0, margin: 0 };
          }
          memberRevenue[leadId].revenue += currency === 'NGN' ? (p.contractValueNGN || 0) : (p.contractValueUSD || 0);
          memberRevenue[leadId].margin += currency === 'NGN' ? (p.marginValueNGN || 0) : (p.marginValueUSD || 0);
          memberRevenue[leadId].projects += 1;
        }
      }
    });
    
    return Object.values(memberRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency]);

  const revenueByCustomer = useMemo(() => {
    const customerRevenue: Record<string, { name: string; revenue: number; projects: number; margin: number }> = {};
    
    filteredProjects.forEach(p => {
      const client = p.clientName || 'Unknown';
      if (!customerRevenue[client]) {
        customerRevenue[client] = { name: client, revenue: 0, projects: 0, margin: 0 };
      }
      customerRevenue[client].revenue += currency === 'NGN' ? (p.contractValueNGN || 0) : (p.contractValueUSD || 0);
      customerRevenue[client].margin += currency === 'NGN' ? (p.marginValueNGN || 0) : (p.marginValueUSD || 0);
      customerRevenue[client].projects += 1;
    });
    
    return Object.values(customerRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency]);

  const revenueBySegment = useMemo(() => {
    const segmentRevenue: Record<string, { name: string; revenue: number; projects: number; margin: number }> = {};
    
    filteredProjects.forEach(p => {
      const segment = p.businessSegment || 'Unassigned';
      if (!segmentRevenue[segment]) {
        segmentRevenue[segment] = { name: segment, revenue: 0, projects: 0, margin: 0 };
      }
      segmentRevenue[segment].revenue += currency === 'NGN' ? (p.contractValueNGN || 0) : (p.contractValueUSD || 0);
      segmentRevenue[segment].margin += currency === 'NGN' ? (p.marginValueNGN || 0) : (p.marginValueUSD || 0);
      segmentRevenue[segment].projects += 1;
    });
    
    return Object.values(segmentRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredProjects, currency]);

  const totalRevenue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => 
      sum + (currency === 'NGN' ? (p.contractValueNGN || 0) : (p.contractValueUSD || 0)), 0
    );
  }, [filteredProjects, currency]);

  const formatCurrency = (value: number) => {
    if (currency === 'NGN') {
      return `₦${value.toLocaleString()}`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-foreground">Revenue Analytics</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={currency} onValueChange={(v) => setCurrency(v as 'NGN' | 'USD')}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="NGN">NGN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(Object.keys(filterLabels) as RevenueFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-8"
            >
              {filterLabels[f]}
            </Button>
          ))}
        </div>

        {/* Total Revenue Display */}
        <div className="mt-4 p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Revenue ({filterLabels[filter]})</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{filteredProjects.length} projects</p>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="project" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4 h-auto p-1">
            <TabsTrigger value="project" className="flex items-center justify-center gap-1 text-xs py-2 px-1 sm:px-3">
              <DollarSign className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline truncate">By Project</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center justify-center gap-1 text-xs py-2 px-1 sm:px-3">
              <Users className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline truncate">By Team</span>
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center justify-center gap-1 text-xs py-2 px-1 sm:px-3">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline truncate">By Customer</span>
            </TabsTrigger>
            <TabsTrigger value="segment" className="flex items-center justify-center gap-1 text-xs py-2 px-1 sm:px-3">
              <Layers className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline truncate">By Segment</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="space-y-2 max-h-64 overflow-y-auto">
            {revenueByProject.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{item.sector}</Badge>
                    <span className="text-xs text-muted-foreground">{item.client}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-sm text-foreground">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Margin: {formatCurrency(item.margin)}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="team" className="space-y-2 max-h-64 overflow-y-auto">
            {revenueByTeamMember.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.projects} project(s)</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-foreground">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Margin: {formatCurrency(item.margin)}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="customer" className="space-y-2 max-h-64 overflow-y-auto">
            {revenueByCustomer.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.projects} project(s)</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-foreground">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Margin: {formatCurrency(item.margin)}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="segment" className="space-y-2 max-h-64 overflow-y-auto">
            {revenueBySegment.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.projects} project(s)</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-foreground">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Margin: {formatCurrency(item.margin)}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
