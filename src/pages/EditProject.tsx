import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { sectors, businessSegments } from '@/data/mockData';
import { Sector, DealProbability, PipelineStage, BusinessSegment, PIPELINE_STAGES } from '@/types';
import { toast } from 'sonner';
import { PipelineStageSelector } from '@/components/projects/PipelineStageSelector';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';

const dealProbabilities: { value: DealProbability; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-chart-2/20 text-chart-2' },
  { value: 'medium', label: 'Medium', color: 'bg-chart-4/20 text-chart-4' },
  { value: 'high', label: 'High', color: 'bg-chart-3/20 text-chart-3' },
  { value: 'critical', label: 'Critical', color: 'bg-destructive/20 text-destructive' },
];

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch project data
  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => id ? projectsService.getById(id) : Promise.reject('No ID'),
    enabled: !!id,
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sector: '' as Sector | '',
    status: 'active' as 'active' | 'on-hold' | 'completed',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    dealProbability: 'low' as DealProbability,
    pipelineStage: 'initiation' as PipelineStage,
    pipelineIntakeDate: undefined as Date | undefined,
    clientName: '',
    clientContact: '',
    oem: '',
    location: '',
    expectedCloseDate: undefined as Date | undefined,
    businessSegment: '' as BusinessSegment | '',
    product: '',
    subProduct: '',
    projectLeadId: '',
    assigneeId: '',
    channelPartner: '',
    contractValueNGN: '',
    contractValueUSD: '',
    marginPercentNGN: '',
    marginPercentUSD: '',
    projectLeadComments: '',
  });

  // Populate form when project data loads
  useEffect(() => {
    if (projectData) {
      const data: any = (projectData as any)?.data || projectData;
      setFormData({
        name: data.name || '',
        description: data.description || '',
        sector: data.sector || '',
        status: data.status || 'active',
        startDate: data.start_date || data.startDate ? parseISO(data.start_date || data.startDate) : undefined,
        endDate: data.end_date || data.endDate ? parseISO(data.end_date || data.endDate) : undefined,
        dealProbability: (data.deal_probability || data.dealProbability || data.risk_level || data.riskLevel || 'low') as DealProbability,
        pipelineStage: (data.pipeline_stage || data.pipelineStage || 'initiation') as PipelineStage,
        pipelineIntakeDate: data.pipeline_intake_date || data.pipelineIntakeDate ? parseISO(data.pipeline_intake_date || data.pipelineIntakeDate) : undefined,
        clientName: data.client_name || data.clientName || '',
        clientContact: data.client_contact || data.clientContact || '',
        oem: data.oem || '',
        location: data.location || '',
        expectedCloseDate: data.expected_close_date || data.expectedCloseDate ? parseISO(data.expected_close_date || data.expectedCloseDate) : undefined,
        businessSegment: (data.business_segment || data.businessSegment || '') as BusinessSegment | '',
        product: data.product || '',
        subProduct: data.sub_product || data.subProduct || '',
        projectLeadId: String(data.project_lead_id || data.projectLeadId || ''),
        assigneeId: String(data.assignee_id || data.assigneeId || ''),
        channelPartner: data.channel_partner || data.channelPartner || '',
        contractValueNGN: data.contract_value_ngn || data.contractValueNGN ? String(data.contract_value_ngn || data.contractValueNGN) : '',
        contractValueUSD: data.contract_value_usd || data.contractValueUSD ? String(data.contract_value_usd || data.contractValueUSD) : '',
        marginPercentNGN: data.margin_percent_ngn || data.marginPercentNGN ? String(data.margin_percent_ngn || data.marginPercentNGN) : '',
        marginPercentUSD: data.margin_percent_usd || data.marginPercentUSD ? String(data.margin_percent_usd || data.marginPercentUSD) : '',
        projectLeadComments: data.project_lead_comments || data.projectLeadComments || '',
      });
    }
  }, [projectData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.sector || !formData.startDate || !id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await projectsService.update(id, {
        name: formData.name,
        description: formData.description,
        sector: formData.sector as Sector,
        status: formData.status,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate?.toISOString(),
        clientName: formData.clientName || undefined,
        clientContact: formData.clientContact || undefined,
        pipelineStage: formData.pipelineStage,
        pipelineIntakeDate: formData.pipelineIntakeDate?.toISOString(),
        oem: formData.oem || undefined,
        location: formData.location || undefined,
        expectedCloseDate: formData.expectedCloseDate?.toISOString(),
        businessSegment: formData.businessSegment as BusinessSegment || undefined,
        product: formData.product || undefined,
        subProduct: formData.subProduct || undefined,
        projectLeadId: formData.projectLeadId || undefined,
        assigneeId: formData.assigneeId || undefined,
        channelPartner: formData.channelPartner || undefined,
        contractValueNGN: formData.contractValueNGN ? parseFloat(formData.contractValueNGN) : undefined,
        contractValueUSD: formData.contractValueUSD ? parseFloat(formData.contractValueUSD) : undefined,
        marginPercentNGN: formData.marginPercentNGN ? parseFloat(formData.marginPercentNGN) : undefined,
        marginPercentUSD: formData.marginPercentUSD ? parseFloat(formData.marginPercentUSD) : undefined,
        projectLeadComments: formData.projectLeadComments || undefined,
        dealProbability: formData.dealProbability,
      });
      toast.success('Project updated successfully!');
      navigate(`/projects/${id}`);
    } catch (error: any) {
      console.error('Failed to update project:', error);
      toast.error(error.response?.data?.message || 'Failed to update project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="self-start shrink-0">
          <Link to={`/projects/${id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Update project details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pipeline Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stage</CardTitle>
            <CardDescription>Current stage in the sales pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineStageSelector
              currentStage={formData.pipelineStage}
              onStageChange={(stage) => setFormData({ ...formData, pipelineStage: stage })}
            />
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the project"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sector *</Label>
                <Select value={formData.sector} onValueChange={(value: Sector) => setFormData({ ...formData, sector: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deal Probability</Label>
              <Select value={formData.dealProbability} onValueChange={(value: DealProbability) => setFormData({ ...formData, dealProbability: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dealProbabilities.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.startDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.startDate} onSelect={(date) => setFormData({ ...formData, startDate: date })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.endDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.endDate} onSelect={(date) => setFormData({ ...formData, endDate: date })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.expectedCloseDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expectedCloseDate ? format(formData.expectedCloseDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.expectedCloseDate} onSelect={(date) => setFormData({ ...formData, expectedCloseDate: date })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Pipeline Intake Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.pipelineIntakeDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.pipelineIntakeDate ? format(formData.pipelineIntakeDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.pipelineIntakeDate} onSelect={(date) => setFormData({ ...formData, pipelineIntakeDate: date })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientContact">Client Contact</Label>
                <Input
                  id="clientContact"
                  value={formData.clientContact}
                  onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })}
                  placeholder="Email or phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="oem">OEM</Label>
                <Input
                  id="oem"
                  value={formData.oem}
                  onChange={(e) => setFormData({ ...formData, oem: e.target.value })}
                  placeholder="Original Equipment Manufacturer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Project location"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Input
                  id="product"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  placeholder="Product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subProduct">Sub Product</Label>
                <Input
                  id="subProduct"
                  value={formData.subProduct}
                  onChange={(e) => setFormData({ ...formData, subProduct: e.target.value })}
                  placeholder="Sub product name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channelPartner">Channel Partner</Label>
              <Input
                id="channelPartner"
                value={formData.channelPartner}
                onChange={(e) => setFormData({ ...formData, channelPartner: e.target.value })}
                placeholder="Channel partner name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Team Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Lead</Label>
                <Select value={formData.projectLeadId} onValueChange={(value) => setFormData({ ...formData, projectLeadId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member: any) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={formData.assigneeId} onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member: any) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
            <CardDescription>Contract values and margins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Value (NGN)</Label>
                <Input
                  type="number"
                  value={formData.contractValueNGN}
                  onChange={(e) => setFormData({ ...formData, contractValueNGN: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Contract Value (USD)</Label>
                <Input
                  type="number"
                  value={formData.contractValueUSD}
                  onChange={(e) => setFormData({ ...formData, contractValueUSD: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Margin % (NGN)</Label>
                <Input
                  type="number"
                  value={formData.marginPercentNGN}
                  onChange={(e) => setFormData({ ...formData, marginPercentNGN: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Margin % (USD)</Label>
                <Input
                  type="number"
                  value={formData.marginPercentUSD}
                  onChange={(e) => setFormData({ ...formData, marginPercentUSD: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Project Lead Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.projectLeadComments}
              onChange={(e) => setFormData({ ...formData, projectLeadComments: e.target.value })}
              placeholder="Add any additional comments or notes..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Updating...' : 'Update Project'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(`/projects/${id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
