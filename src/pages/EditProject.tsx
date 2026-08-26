import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { sectors, businessSegments } from "@/data/mockData";
import {
  Sector,
  RiskLevel,
  PipelineStage,
  BusinessSegment,
  PIPELINE_STAGES,
} from "@/types";
import { toast } from "sonner";
import { parseNumberInput } from "@/lib/utils";
import { PipelineStageSelector } from "@/components/projects/PipelineStageSelector";
import { ProjectImageUpload } from "@/components/projects/ProjectImageUpload";
import { projectsService } from "@/services/projects";
import { teamService } from "@/services/team";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import { PRODUCT_OPTIONS, getSubproductOptions } from "@/data/productCatalog";

const dealProbabilities: { value: RiskLevel; label: string; color: string }[] =
  [
    { value: "low", label: "Low", color: "bg-chart-2/20 text-chart-2" },
    { value: "medium", label: "Medium", color: "bg-chart-4/20 text-chart-4" },
    { value: "high", label: "High", color: "bg-chart-3/20 text-chart-3" },
    {
      value: "critical",
      label: "Critical",
      color: "bg-destructive/20 text-destructive",
    },
    {
      value: "uncertain",
      label: "Uncertain",
      color: "bg-muted/50 text-muted-foreground",
    },
  ];

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch project data
  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const project = await projectsService.getById(id);
      return project; // projectsService.getById already returns the normalized project
    },
    enabled: !!id,
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team"],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects-for-oem-options"],
    queryFn: () => projectsService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 min cache, this list barely changes
  });
  const oemOptions = Array.from(
    new Set(
      allProjects
        .map((p) => p.oem?.trim())
        .filter((o): o is string => !!o && o !== "n/a"),
    ),
  ).sort();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sector: "" as Sector | "",
    status: "active" as "active" | "on-hold" | "completed" | "inactive",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    dealProbability: "low" as RiskLevel,
    pipelineStage: "initiation" as PipelineStage,
    pipelineIntakeDate: undefined as Date | undefined,
    clientName: "",
    clientContact: "",
    oem: "",
    location: "",
    expectedCloseDate: undefined as Date | undefined,
    businessSegment: "" as BusinessSegment | "",
    products: [] as string[],
    subproducts: [] as string[],
    projectLeadId: "",
    assigneeId: "",
    channelPartner: "",
    contractValueNGN: "",
    contractValueUSD: "",
    marginPercentNGN: "",
    marginPercentUSD: "",
    projectLeadComments: "",
    supportNeeded: "",
    projectImage: undefined as string | undefined,
  });

  // Helper to safely parse dates
  const parseDate = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      return parseISO(dateStr);
    } catch {
      return undefined;
    }
  };

  // Helper to get financial value as string for form input
  const getFinancialStr = (
    value: number | string | null | undefined,
  ): string => {
    if (value == null) return "";
    if (typeof value === "number") {
      return value > 0 ? String(value) : "";
    }
    return String(value);
  };

  // Populate form when project data loads
  useEffect(() => {
    if (!projectData) return;

    // Handle both raw project object and wrapped { data: project } responses
    const data = (projectData as any)?.data ?? (projectData as any);

    setFormData({
      name: data.name ?? "",
      description: data.description ?? "",
      sector: data.sector ?? "",
      status: data.status ?? "active",

      // Prefer normalized camelCase fields but fall back to snake_case from the API
      startDate: data.startDate
        ? parseISO(data.startDate)
        : data.start_date
          ? parseISO(data.start_date)
          : undefined,
      endDate: data.endDate
        ? parseISO(data.endDate)
        : data.end_date
          ? parseISO(data.end_date)
          : undefined,
      pipelineIntakeDate: data.pipelineIntakeDate
        ? parseISO(data.pipelineIntakeDate)
        : data.pipeline_intake_date
          ? parseISO(data.pipeline_intake_date)
          : undefined,
      expectedCloseDate: data.expectedCloseDate
        ? parseISO(data.expectedCloseDate)
        : data.expected_close_date
          ? parseISO(data.expected_close_date)
          : undefined,

      dealProbability: (data.dealProbability ??
        data.riskLevel ??
        data.risk_level ??
        "low") as RiskLevel,
      pipelineStage: (data.pipelineStage ??
        data.pipeline_stage ??
        "initiation") as PipelineStage,

      clientName: data.clientName ?? data.client_name ?? "",
      clientContact: data.clientContact ?? data.client_contact ?? "",
      oem: data.oem ?? "",
      location: data.location ?? "",
      businessSegment: (data.businessSegment ?? data.business_segment ?? "") as
        | BusinessSegment
        | "",
      products: Array.isArray(data.products)
        ? data.products.filter(Boolean).map(String)
        : data.product
          ? [String(data.product)]
          : [],
      subproducts: Array.isArray(data.subproducts)
        ? data.subproducts.filter(Boolean).map(String)
        : Array.isArray(data.sub_products)
          ? data.sub_products.filter(Boolean).map(String)
          : (data.subProduct ?? data.sub_product)
            ? [String(data.subProduct ?? data.sub_product)]
            : [],

      projectLeadId: String(data.projectLeadId ?? data.project_lead_id ?? ""),
      assigneeId: String(data.assigneeId ?? data.assignee_id ?? ""),
      channelPartner: data.channelPartner ?? data.channel_partner ?? "",

      contractValueNGN:
        data.contractValueNGN != null
          ? String(data.contractValueNGN)
          : data.contract_value_ngn != null
            ? String(data.contract_value_ngn)
            : "",
      contractValueUSD:
        data.contractValueUSD != null
          ? String(data.contractValueUSD)
          : data.contract_value_usd != null
            ? String(data.contract_value_usd)
            : "",
      marginPercentNGN:
        data.marginPercentNGN != null
          ? String(data.marginPercentNGN)
          : data.margin_percent_ngn != null
            ? String(data.margin_percent_ngn)
            : "",
      marginPercentUSD:
        data.marginPercentUSD != null
          ? String(data.marginPercentUSD)
          : data.margin_percent_usd != null
            ? String(data.margin_percent_usd)
            : "",

      projectLeadComments:
        data.projectLeadComments ?? data.project_lead_comments ?? "",
      supportNeeded: data.supportNeeded ?? data.support_needed ?? "",
      projectImage: data.projectImage ?? data.project_image ?? undefined,
    });
  }, [projectData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.description ||
      !formData.sector ||
      !formData.startDate ||
      !id
    ) {
      toast.error("Please fill in all required fields");
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
        businessSegment: (formData.sector as BusinessSegment) || undefined,
        products: formData.products,
        subproducts: formData.subproducts,
        projectLeadId: formData.projectLeadId || undefined,
        assigneeId: formData.assigneeId || null,
        channelPartner: formData.channelPartner || undefined,
        // Convert string values to numbers, send undefined if empty
        contractValueNGN: parseNumberInput(formData.contractValueNGN),
        contractValueUSD: parseNumberInput(formData.contractValueUSD),
        marginPercentNGN: parseNumberInput(formData.marginPercentNGN),
        marginPercentUSD: parseNumberInput(formData.marginPercentUSD),
        // Calculate margin values if both contract value and margin percent are provided
        marginValueNGN:
          parseNumberInput(formData.contractValueNGN) != null &&
          parseNumberInput(formData.marginPercentNGN) != null
            ? (parseNumberInput(formData.contractValueNGN)! *
                parseNumberInput(formData.marginPercentNGN)!) /
              100
            : undefined,
        marginValueUSD:
          parseNumberInput(formData.contractValueUSD) != null &&
          parseNumberInput(formData.marginPercentUSD) != null
            ? (parseNumberInput(formData.contractValueUSD)! *
                parseNumberInput(formData.marginPercentUSD)!) /
              100
            : undefined,
        projectLeadComments: formData.projectLeadComments || undefined,
        supportNeeded: formData.supportNeeded || undefined,
        projectImage: formData.projectImage ?? null,
        dealProbability: formData.dealProbability,
      });
      toast.success("Project updated successfully!");
      // Invalidate caches so detail/list pages re-fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${id}`);
    } catch (error: any) {
      console.error("Failed to update project:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to update project. Please try again.",
      );
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
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="self-start shrink-0"
        >
          <Link to={`/projects/${id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Edit Project
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Update project details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Image - Top Right */}
        {formData.projectImage && (
          <div className="flex justify-end">
            <div className="relative group">
              <img
                src={formData.projectImage}
                alt="Project"
                className="w-[200px] h-[200px] object-contain rounded-lg border border-border bg-muted/30"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                onClick={() =>
                  setFormData({ ...formData, projectImage: undefined })
                }
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Pipeline Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stage</CardTitle>
            <CardDescription>
              Current stage in the sales pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineStageSelector
              currentStage={formData.pipelineStage}
              onStageChange={(stage) =>
                setFormData({ ...formData, pipelineStage: stage })
              }
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the project"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Vertical *</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value: Sector) =>
                    setFormData({ ...formData, sector: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business vertical" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.sector &&
                      !(sectors as string[]).includes(formData.sector) && (
                        <SelectItem
                          value={formData.sector}
                          disabled
                          className="text-muted-foreground italic"
                        >
                          {formData.sector} — Unknown, please update
                        </SelectItem>
                      )}
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
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deal Probability</Label>
              <Select
                value={formData.dealProbability}
                onValueChange={(value: RiskLevel) =>
                  setFormData({ ...formData, dealProbability: value })
                }
              >
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
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate
                        ? format(formData.startDate, "PPP")
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) =>
                        setFormData({ ...formData, startDate: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate
                        ? format(formData.endDate, "PPP")
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) =>
                        setFormData({ ...formData, endDate: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.expectedCloseDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expectedCloseDate
                        ? format(formData.expectedCloseDate, "PPP")
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expectedCloseDate}
                      onSelect={(date) =>
                        setFormData({ ...formData, expectedCloseDate: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Pipeline Intake Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.pipelineIntakeDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.pipelineIntakeDate
                        ? format(formData.pipelineIntakeDate, "PPP")
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.pipelineIntakeDate}
                      onSelect={(date) =>
                        setFormData({ ...formData, pipelineIntakeDate: date })
                      }
                      initialFocus
                    />
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
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="Enter client name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientContact">Client Contact</Label>
                <Input
                  id="clientContact"
                  value={formData.clientContact}
                  onChange={(e) =>
                    setFormData({ ...formData, clientContact: e.target.value })
                  }
                  placeholder="Email or phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>OEM</Label>
                <Select
                  value={formData.oem || "n/a"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, oem: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Original Equipment Manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n/a">n/a</SelectItem>
                    {oemOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Project location"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <MultiSearchableSelect
                  values={formData.products}
                  onValuesChange={(vals) =>
                    setFormData({ ...formData, products: vals })
                  }
                  options={PRODUCT_OPTIONS}
                  placeholder="Select products"
                  searchPlaceholder="Search products..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subProduct">Sub Product</Label>
                <MultiSearchableSelect
                  values={formData.subproducts}
                  onValuesChange={(vals) =>
                    setFormData({ ...formData, subproducts: vals })
                  }
                  options={(() => {
                    const catalogOptions = getSubproductOptions(
                      formData.products,
                    );
                    const extraSaved = formData.subproducts
                      .filter(
                        (sp) => !catalogOptions.some((o) => o.value === sp),
                      )
                      .map((sp) => ({ value: sp, label: sp }));
                    return [...catalogOptions, ...extraSaved];
                  })()}
                  disabled={
                    getSubproductOptions(formData.products).length === 0
                  }
                  placeholder={
                    formData.products.length === 0
                      ? "Select a product first"
                      : "Select sub products"
                  }
                  searchPlaceholder="Search sub products..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channelPartner">Channel Partner</Label>
              <Input
                id="channelPartner"
                value={formData.channelPartner}
                onChange={(e) =>
                  setFormData({ ...formData, channelPartner: e.target.value })
                }
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
                <Select
                  value={formData.projectLeadId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectLeadId: value })
                  }
                >
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
                <Select
                  value={formData.assigneeId || "__none__"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      assigneeId: value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No Assignee —</SelectItem>
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
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium">Naira (₦)</h4>
                <div className="space-y-2">
                  <Label>Contract/PO Value (₦)</Label>
                  <Input
                    type="number"
                    value={formData.contractValueNGN}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contractValueNGN: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Margin %</Label>
                    <Input
                      type="number"
                      value={formData.marginPercentNGN}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          marginPercentNGN: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Margin Value (₦)</Label>
                    <Input
                      type="number"
                      value={
                        formData.contractValueNGN && formData.marginPercentNGN
                          ? (
                              (parseFloat(formData.contractValueNGN) *
                                parseFloat(formData.marginPercentNGN)) /
                              100
                            ).toFixed(2)
                          : ""
                      }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contractValueUSD: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Margin %</Label>
                    <Input
                      type="number"
                      value={formData.marginPercentUSD}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          marginPercentUSD: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Margin Value ($)</Label>
                    <Input
                      type="number"
                      value={
                        formData.contractValueUSD && formData.marginPercentUSD
                          ? (
                              (parseFloat(formData.contractValueUSD) *
                                parseFloat(formData.marginPercentUSD)) /
                              100
                            ).toFixed(2)
                          : ""
                      }
                      readOnly
                      className="bg-muted cursor-not-allowed"
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Image */}
        <Card>
          <CardHeader>
            <CardTitle>Project Image</CardTitle>
            <CardDescription>
              Upload an image to represent this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectImageUpload
              value={formData.projectImage}
              onChange={(img) =>
                setFormData({ ...formData, projectImage: img })
              }
            />
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  projectLeadComments: e.target.value,
                })
              }
              placeholder="Add any additional comments or notes..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Support Needed */}
        <Card>
          <CardHeader>
            <CardTitle>Support Needed</CardTitle>
            <CardDescription>
              Areas where support is needed on this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.supportNeeded}
              onChange={(e) =>
                setFormData({ ...formData, supportNeeded: e.target.value })
              }
              placeholder="Describe any areas where support is needed..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Updating..." : "Update Project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate(`/projects/${id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
