import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Plus, X, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { sectors, businessSegments } from '@/data/mockData';
import { Sector, RiskLevel, Milestone, PipelineStage, BusinessSegment, PIPELINE_STAGES, ProjectDocument, TeamMember } from '@/types';
import { toast } from 'sonner';
import { PipelineStageSelector } from '@/components/projects/PipelineStageSelector';
import { DocumentManager } from '@/components/projects/DocumentManager';
import { projectsService } from '@/services/projects';
import { teamService } from '@/services/team';
import { useAuth } from '@/context/AuthContext';

const riskLevels: { value: RiskLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-chart-2/20 text-chart-2' },
  { value: 'medium', label: 'Medium', color: 'bg-chart-4/20 text-chart-4' },
  { value: 'high', label: 'High', color: 'bg-chart-3/20 text-chart-3' },
  { value: 'critical', label: 'Critical', color: 'bg-destructive/20 text-destructive' },
];

export default function NewProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch team members from backend
  const { data: teamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Find admin user (Chiemela) to default as project lead
  const adminUser = teamMembers.find((m: any) => 
    m.email?.toLowerCase().includes('chiemela') || 
    m.role?.toLowerCase() === 'admin' ||
    m.systemRole?.toLowerCase() === 'admin'
  );
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sector: '' as Sector | '',
    status: 'active' as 'active' | 'on-hold' | 'completed',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    riskLevel: 'low' as RiskLevel,
    teamMemberIds: [] as string[],
    // Pipeline fields
    pipelineStage: 'initiation' as PipelineStage,
    pipelineIntakeDate: new Date() as Date | undefined,
    // Client fields
    clientName: '',
    clientContact: '',
    // Extended fields
    oem: '',
    location: '',
    expectedCloseDate: undefined as Date | undefined,
    businessSegment: '' as BusinessSegment | '',
    product: '',
    subProduct: '',
    projectLeadId: '',
    assigneeId: '',
    channelPartner: '',
    // Financial fields (independent currencies)
    contractValueNGN: '',
    contractValueUSD: '',
    marginPercentNGN: '',
    marginPercentUSD: '',
    // Comments
    projectLeadComments: '',
  });

  // Set default project lead when team members load
  useEffect(() => {
    if (adminUser && !formData.projectLeadId) {
      setFormData(prev => ({ ...prev, projectLeadId: String(adminUser.id) }));
    }
  }, [adminUser, formData.projectLeadId]);

  const [milestones, setMilestones] = useState<Omit<Milestone, 'id'>[]>([]);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: undefined as Date | undefined });
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);

  const handleAddMilestone = () => {
    if (!newMilestone.title || !newMilestone.dueDate) {
      toast.error('Please provide milestone title and due date');
      return;
    }
    setMilestones([...milestones, { ...newMilestone, dueDate: newMilestone.dueDate.toISOString(), completed: false }]);
    setNewMilestone({ title: '', dueDate: undefined });
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleTeamMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.includes(memberId)
        ? prev.teamMemberIds.filter(id => id !== memberId)
        : [...prev.teamMemberIds, memberId]
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.sector || !formData.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await projectsService.create({
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
      });
      toast.success('Project created successfully!');
      navigate('/projects');
    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Fill in the details to create a new project</p>
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
            <CardDescription>Core project details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Sector *</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value: Sector) => setFormData({ ...formData, sector: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the project objectives and scope"
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Pipeline Intake Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.pipelineIntakeDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.pipelineIntakeDate ? format(formData.pipelineIntakeDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.pipelineIntakeDate} onSelect={(date) => setFormData({ ...formData, pipelineIntakeDate: date })} initialFocus /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.startDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.startDate} onSelect={(date) => setFormData({ ...formData, startDate: date })} initialFocus /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.expectedCloseDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expectedCloseDate ? format(formData.expectedCloseDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.expectedCloseDate} onSelect={(date) => setFormData({ ...formData, expectedCloseDate: date })} initialFocus /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'on-hold' | 'completed') => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product & Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Product & Business Details</CardTitle>
            <CardDescription>Product and business segment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Business Segment</Label>
                <Select value={formData.businessSegment} onValueChange={(value: BusinessSegment) => setFormData({ ...formData, businessSegment: value })}>
                  <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                  <SelectContent>
                    {businessSegments.map((seg) => (<SelectItem key={seg} value={seg}>{seg}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Input value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} placeholder="e.g., Automation Systems" />
              </div>
              <div className="space-y-2">
                <Label>Sub Product</Label>
                <Input value={formData.subProduct} onChange={(e) => setFormData({ ...formData, subProduct: e.target.value })} placeholder="e.g., Assembly Line Robotics" />
              </div>
              <div className="space-y-2">
                <Label>OEM</Label>
                <Input value={formData.oem} onChange={(e) => setFormData({ ...formData, oem: e.target.value })} placeholder="e.g., Siemens" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Lagos, Nigeria" />
              </div>
              <div className="space-y-2">
                <Label>Channel Partner</Label>
                <Input value={formData.channelPartner} onChange={(e) => setFormData({ ...formData, channelPartner: e.target.value })} placeholder="Partner company name" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} placeholder="Client company name" />
              </div>
              <div className="space-y-2">
                <Label>Client Contact</Label>
                <Input value={formData.clientContact} onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })} placeholder="Email or phone" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details - Dual Currency */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>Contract value and margin in both Naira and USD</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium">Nigerian Naira (₦)</h4>
                <div className="space-y-2">
                  <Label>Contract/PO Value (₦)</Label>
                  <Input 
                    type="number" 
                    value={formData.contractValueNGN} 
                    onChange={(e) => setFormData({ ...formData, contractValueNGN: e.target.value })} 
                    placeholder="0" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Margin %</Label>
                    <Input type="number" value={formData.marginPercentNGN} onChange={(e) => setFormData({ ...formData, marginPercentNGN: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Margin Value (₦)</Label>
                    <Input 
                      type="number" 
                      value={formData.contractValueNGN && formData.marginPercentNGN 
                        ? (parseFloat(formData.contractValueNGN) * parseFloat(formData.marginPercentNGN) / 100).toFixed(2) 
                        : ''} 
                      readOnly 
                      className="bg-muted cursor-not-allowed" 
                      placeholder="Auto-calculated" 
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium">US Dollar ($)</h4>
                <div className="space-y-2">
                  <Label>Contract/PO Value ($)</Label>
                  <Input 
                    type="number" 
                    value={formData.contractValueUSD} 
                    onChange={(e) => setFormData({ ...formData, contractValueUSD: e.target.value })} 
                    placeholder="0" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Margin %</Label>
                    <Input type="number" value={formData.marginPercentUSD} onChange={(e) => setFormData({ ...formData, marginPercentUSD: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Margin Value ($)</Label>
                    <Input 
                      type="number" 
                      value={formData.contractValueUSD && formData.marginPercentUSD 
                        ? (parseFloat(formData.contractValueUSD) * parseFloat(formData.marginPercentUSD) / 100).toFixed(2) 
                        : ''} 
                      readOnly 
                      className="bg-muted cursor-not-allowed" 
                      placeholder="Auto-calculated" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select value={formData.riskLevel} onValueChange={(value: RiskLevel) => setFormData({ ...formData, riskLevel: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {riskLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className={cn("flex items-center gap-2 px-2 py-0.5 rounded-md", level.color)}>
                        <AlertTriangle className="h-4 w-4" />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Team Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Project Lead</Label>
                <Select value={formData.projectLeadId} onValueChange={(value) => setFormData({ ...formData, projectLeadId: value })}>
                  <SelectTrigger><SelectValue placeholder={isLoadingTeam ? "Loading..." : "Select lead"} /></SelectTrigger>
                  <SelectContent>
                    {isLoadingTeam ? (
                      <div className="py-2 px-2 text-sm text-muted-foreground">Loading team members...</div>
                    ) : teamMembers.length === 0 ? (
                      <div className="py-2 px-2 text-sm text-muted-foreground">No team members found</div>
                    ) : (
                      teamMembers.filter((m: any) => m.id).map((m: any) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={formData.assigneeId} onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}>
                  <SelectTrigger><SelectValue placeholder={isLoadingTeam ? "Loading..." : "Select assignee"} /></SelectTrigger>
                  <SelectContent>
                    {isLoadingTeam ? (
                      <div className="py-2 px-2 text-sm text-muted-foreground">Loading team members...</div>
                    ) : teamMembers.length === 0 ? (
                      <div className="py-2 px-2 text-sm text-muted-foreground">No team members found</div>
                    ) : (
                      teamMembers.filter((m: any) => m.id).map((m: any) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Team Members</Label>
              {isLoadingTeam ? (
                <p className="text-sm text-muted-foreground">Loading team members...</p>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members found. Add team members in the Team page first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((member: any) => (
                    <Badge 
                      key={member.id} 
                      variant={formData.teamMemberIds.includes(String(member.id)) ? 'default' : 'outline'} 
                      className="cursor-pointer" 
                      onClick={() => handleTeamMemberToggle(String(member.id))}
                    >
                      {member.name}
                      {formData.teamMemberIds.includes(String(member.id)) && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Project Lead Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={formData.projectLeadComments} onChange={(e) => setFormData({ ...formData, projectLeadComments: e.target.value })} placeholder="Add any notes or comments..." rows={3} />
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <Label>Milestone Title</Label>
                <Input value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} placeholder="e.g., Phase 1 Completion" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-[180px] justify-start text-left font-normal', !newMilestone.dueDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newMilestone.dueDate ? format(newMilestone.dueDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newMilestone.dueDate} onSelect={(date) => setNewMilestone({ ...newMilestone, dueDate: date })} initialFocus /></PopoverContent>
                </Popover>
              </div>
              <Button type="button" onClick={handleAddMilestone}><Plus className="h-4 w-4" /></Button>
            </div>
            {milestones.length > 0 && (
              <div className="space-y-2">
                {milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground">Due: {format(new Date(milestone.dueDate), 'PPP')}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMilestone(index)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <DocumentManager documents={documents} onDocumentsChange={setDocuments} />

        <Separator />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/projects')} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </div>
  );
}
