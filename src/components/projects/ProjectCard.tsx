import { memo, useState, type ReactNode } from "react";
import { Project, Sector, PIPELINE_STAGES } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sectorColors, sectorIcons, stageColors } from "@/data/mockData";
import { Calendar, CheckSquare, ChevronDown, MoreHorizontal, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { differenceInCalendarDays, format, isValid, parseISO, startOfToday } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { getStageProgress } from "@/lib/stageProgress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_OPPORTUNITY_CARD_FIELDS,
  OPPORTUNITY_CARD_FIELD_OPTIONS,
} from "@/services/opportunityCardPreferences";
import { OpportunityCardSettingsDialog } from "./OpportunityCardSettingsDialog";

interface ProjectCardProps {
  project: Project;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
  cardFields?: string[];
  isCardOverride?: boolean;
  canViewFinancialFields?: boolean;
  cardPreferenceSaving?: boolean;
  onSaveCardFields?: (projectId: string, fields: string[]) => void | Promise<void>;
  onApplyCardFieldsToAll?: (fields: string[]) => void | Promise<void>;
  onResetCardFields?: (projectId: string) => void | Promise<void>;
}

function safeFormatDate(
  dateStr: string | undefined,
  formatStr: string,
): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return isValid(date) ? format(date, formatStr) : "-";
}

const statusColors: Record<string, string> = {
  active: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  "on-hold": "bg-chart-5/20 text-chart-5 border-chart-5/30",
  on_hold: "bg-chart-5/20 text-chart-5 border-chart-5/30",
  completed: "bg-chart-2/20 text-chart-2 border-chart-2/30",
};

const probabilityColors: Record<string, string> = {
  high: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  medium: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  low: "bg-muted text-muted-foreground border-border",
};

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 flex items-baseline gap-2 text-xs sm:text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground/90">
        {children}
      </span>
    </div>
  );
}

function ProjectCardComponent({
  project,
  selectable,
  selected,
  onSelectToggle,
  cardFields = [...DEFAULT_OPPORTUNITY_CARD_FIELDS],
  isCardOverride = false,
  canViewFinancialFields = false,
  cardPreferenceSaving = false,
  onSaveCardFields,
  onApplyCardFieldsToAll,
  onResetCardFields,
}: ProjectCardProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { formatCurrencyFor, getContractDisplay, getMarginDisplay } = useCurrency();

  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const completedTasks =
    project.completedTasksCount ??
    tasks.filter((t) => t.status === "completed").length;
  const tasksTotal = project.tasksCount ?? tasks.length;

  const stageLabel =
    PIPELINE_STAGES.find((s) => s.value === project.pipelineStage)?.label ||
    project.pipelineStage;

  const selectedFields = cardFields.filter((field) =>
    OPPORTUNITY_CARD_FIELD_OPTIONS.some(
      (option) => option.key === field && (canViewFinancialFields || !('financial' in option)),
    ),
  );
  const headerFieldKeys = ["businessVertical", "projectStatus", "pipelineStage", "dealProbability"];
  const financialFieldKeys = ["contractValue", "expectedMargin"];
  const footerFieldKeys = [
    "progress",
    "taskSummary",
    "teamMembers",
    "pipelineIntakeDate",
    "expectedCloseDate",
    "daysRemaining",
    "lastUpdated",
    "startDate",
  ];
  const headerFields = selectedFields.filter((field) => headerFieldKeys.includes(field));
  const financialFields = selectedFields.filter((field) => financialFieldKeys.includes(field));
  const footerFields = selectedFields.filter((field) => footerFieldKeys.includes(field));
  const informationFields = selectedFields.filter(
    (field) =>
      field !== "projectName" &&
      !headerFieldKeys.includes(field) &&
      !financialFieldKeys.includes(field) &&
      !footerFieldKeys.includes(field),
  );
  const products = [
    ...(project.products?.length ? project.products : project.product ? [project.product] : []),
    ...(project.subproducts?.length
      ? project.subproducts
      : project.subProduct
        ? [project.subProduct]
        : []),
  ].filter(Boolean);
  const contractDisplay = canViewFinancialFields ? getContractDisplay(project) : null;
  const marginDisplay = canViewFinancialFields ? getMarginDisplay(project) : null;
  const closed =
    project.status === "completed" ||
    project.status === "cancelled" ||
    project.pipelineStage === "closure" ||
    project.pipelineStage === "lost";

  const valueFor = (field: string): string => {
    switch (field) {
      case "businessVertical":
        return project.businessVertical || "Unassigned";
      case "projectStatus":
        return String(project.status || "").replace(/_/g, "-") || "—";
      case "pipelineStage":
        return stageLabel || "—";
      case "teamLead":
        return project.projectLead?.name || "Unassigned";
      case "teamMembers": {
        const names = project.teamMembers?.map((member) => member.name).filter(Boolean) ?? [];
        return names.length ? names.join(", ") : `${project.teamMemberIds?.length ?? project.teamSize ?? 0} assigned`;
      }
      case "leadTime":
        return project.leadTime?.trim() || "—";
      case "pipelineIntakeDate":
        return safeFormatDate(project.pipelineIntakeDate, "MMM d, yyyy");
      case "expectedCloseDate":
        return safeFormatDate(project.expectedCloseDate, "MMM d, yyyy");
      case "daysRemaining": {
        if (!project.expectedCloseDate || closed) return "—";
        const closeDate = parseISO(project.expectedCloseDate);
        if (!isValid(closeDate)) return "—";
        const days = differenceInCalendarDays(closeDate, startOfToday());
        if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
        if (days === 0) return "Due today";
        return `${days} day${days === 1 ? "" : "s"} remaining`;
      }
      case "clientName":
        return project.clientName || "—";
      case "sector":
        return project.sector || "—";
      case "oem":
        return project.oem && project.oem.toLowerCase() !== "n/a" ? project.oem : "—";
      case "channelPartner":
        return project.partners?.map((partner) => partner.companyName).filter(Boolean).join(", ")
          || project.channelPartner
          || "—";
      case "products":
        return products.join(", ") || "—";
      case "contractValue":
        return contractDisplay
          ? formatCurrencyFor(contractDisplay.value, contractDisplay.currency)
          : "—";
      case "expectedMargin": {
        if (marginDisplay) {
          return formatCurrencyFor(marginDisplay.value, marginDisplay.currency);
        }
        const percentage = project.marginPercentNGN ?? project.marginPercentUSD;
        return typeof percentage === "number" && Number.isFinite(percentage)
          ? `${percentage}%`
          : "—";
      }
      case "dealProbability":
        return project.dealProbability || "—";
      case "progress":
        return `${getStageProgress(project.pipelineStage, project.progress)}%`;
      case "location":
        return project.location || "—";
      case "taskSummary":
        return `${completedTasks}/${tasksTotal} completed`;
      case "lastUpdated":
        return safeFormatDate(project.updatedAt, "MMM d, yyyy");
      case "startDate":
        return safeFormatDate(project.startDate, "MMM d, yyyy");
      case "description":
        return project.description?.trim() || "—";
      default:
        return "—";
    }
  };

  const renderField = (field: string) => {
    const option = OPPORTUNITY_CARD_FIELD_OPTIONS.find((item) => item.key === field);
    if (!option) return null;
    if (field === "projectName") return null;
    const value = valueFor(field);

    if (field === "progress") {
      const progress = getStageProgress(project.pipelineStage, project.progress);
      return (
        <div key={field} className="col-span-full space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">{option.label}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      );
    }

    if (field === "taskSummary") {
      return (
        <MetaRow key={field} label="">
          <span className="inline-flex min-w-0 items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">Tasks: {value}</span>
          </span>
        </MetaRow>
      );
    }

    if (field === "teamMembers") {
      return (
        <MetaRow key={field} label="">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">Team: {value}</span>
          </span>
        </MetaRow>
      );
    }

    if (field === "progress") {
      return (
        <MetaRow key={field} label="Progress">
          {value}
        </MetaRow>
      );
    }

    if (["pipelineIntakeDate", "expectedCloseDate", "daysRemaining", "lastUpdated", "startDate"].includes(field)) {
      return (
        <MetaRow key={field} label={option.label}>
          <span className="inline-flex min-w-0 items-center gap-1">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{value}</span>
          </span>
        </MetaRow>
      );
    }

    if (field === "description") {
      return (
        <div key={field} className="col-span-full min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{option.label}</p>
          <p className="mt-1 text-sm text-foreground/90 line-clamp-3 break-words">{value}</p>
        </div>
      );
    }

    if (field === "businessVertical") {
      return (
        <MetaRow key={field} label={option.label}>
          <span className="truncate">
            {sectorIcons[project.businessVertical as Sector] || "📁"} {value}
          </span>
        </MetaRow>
      );
    }

    if (field === "projectStatus") {
      return (
        <MetaRow key={field} label={option.label}>
          <Badge
            variant="outline"
            className={`text-[10px] sm:text-xs capitalize ${statusColors[project.status] || ""}`}
          >
            {value}
          </Badge>
        </MetaRow>
      );
    }

    if (field === "pipelineStage") {
      return (
        <MetaRow key={field} label={option.label}>
          <Badge
            variant="outline"
            className={`text-[10px] sm:text-xs ${stageColors[project.pipelineStage] || ""}`}
          >
            {value}
          </Badge>
        </MetaRow>
      );
    }

    if (field === "dealProbability") {
      return (
        <MetaRow key={field} label={option.label}>
          <Badge
            variant="outline"
            className={`text-[10px] sm:text-xs capitalize ${probabilityColors[value.toLowerCase()] || ""}`}
          >
            {value}
          </Badge>
        </MetaRow>
      );
    }

    return (
      <MetaRow key={field} label={option.label}>
        {value}
      </MetaRow>
    );
  };

  const card = (
    <Card
      className={`flex h-[520px] flex-col hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden sm:h-[540px] ${selected ? "border-primary ring-2 ring-primary/20" : ""}`}
    >
      {selectable && (
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectToggle?.(project.id);
          }}
        >
          <Checkbox checked={selected} />
        </div>
      )}
      <CardHeader
        className={`shrink-0 p-5 pb-3 ${selectable ? "pl-10" : ""} ${onSaveCardFields ? "pr-14" : ""}`}
      >
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            {selectedFields.includes("businessVertical") && (
              <span
                className={`max-w-full truncate rounded-md px-2.5 py-1 text-xs font-medium ${sectorColors[project.businessVertical as Sector] || "bg-muted text-muted-foreground"}`}
                title={project.businessVertical || "Unassigned"}
              >
                {sectorIcons[project.businessVertical as Sector] || "📁"}{" "}
                {project.businessVertical || "Unassigned"}
              </span>
            )}
            {selectedFields.includes("projectStatus") && (
              <Badge variant="outline" className={`text-xs capitalize ${statusColors[project.status] || ""}`}>
                {String(project.status || "").replace(/_/g, "-") || "—"}
              </Badge>
            )}
          </div>
          {project.projectImage && (
            <img
              src={project.projectImage}
              alt=""
              className="h-10 w-10 rounded-md object-contain border border-border shrink-0"
            />
          )}
        </div>
        <h3 className="mt-2 min-h-[3.5rem] font-semibold text-lg leading-7 group-hover:text-primary transition-colors line-clamp-2 break-words">
          {project.name}
        </h3>
        {headerFields.some((field) => field === "pipelineStage" || field === "dealProbability") && (
          <div className="mt-2 flex min-h-7 flex-wrap items-center gap-2">
            {selectedFields.includes("pipelineStage") && (
              <Badge variant="outline" className={`text-xs ${stageColors[project.pipelineStage] || ""}`}>
                {stageLabel || "—"}
              </Badge>
            )}
            {selectedFields.includes("dealProbability") && (
              <Badge
                variant="outline"
                className={`text-xs capitalize ${probabilityColors[String(project.dealProbability || "").toLowerCase()] || ""}`}
              >
                {project.dealProbability || "—"} probability
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-5 pt-0 min-w-0">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {informationFields.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b pb-2">
                <h4 className="text-sm font-semibold">Project Details</h4>
                {informationFields.length > 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    aria-expanded={detailsExpanded}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDetailsExpanded((expanded) => !expanded);
                    }}
                  >
                    {detailsExpanded ? "Show less" : "Show all"}
                    <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${detailsExpanded ? "rotate-180" : ""}`} />
                  </Button>
                )}
              </div>
              <div className={`grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 ${!detailsExpanded && informationFields.length > 3 ? "max-h-28 overflow-hidden" : ""}`}>
                {informationFields.map(renderField)}
              </div>
            </section>
          )}
          {financialFields.length > 0 && (
            <section className="mt-4 space-y-3">
              <h4 className="border-b pb-2 text-sm font-semibold">Financial Information</h4>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                {financialFields.map(renderField)}
              </div>
            </section>
          )}
        </div>

        {footerFields.length > 0 && (
          <div className="mt-3 shrink-0 space-y-3 border-t pt-3">
            {footerFields.includes("progress") && renderField("progress")}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {footerFields
                .filter((field) => field !== "progress")
                .map((field) => renderField(field))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const settings = onSaveCardFields ? (
    <div
      className="absolute right-2 top-2 z-20"
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-background/95"
            aria-label={`Customize card for ${project.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setCustomizeOpen(true)}>
            Customize This Card
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null;

  const cardLink = selectable ? (
    <div
      onClick={() => onSelectToggle?.(project.id)}
      className="h-full cursor-pointer min-w-0"
    >
      {card}
    </div>
  ) : (
    <Link to={`/projects/${project.id}`} className="block h-full min-w-0">
      {card}
    </Link>
  );

  if (selectable) {
    return (
      <>
        <div className="relative h-full min-w-0">
          {cardLink}
          {settings}
        </div>
        {onSaveCardFields && (
          <OpportunityCardSettingsDialog
            open={customizeOpen}
            onOpenChange={setCustomizeOpen}
            fields={cardFields}
            canViewFinancialFields={canViewFinancialFields}
            title="Customize This Card"
            description="Choose and reorder fields for this opportunity only."
            saving={cardPreferenceSaving}
            onSave={(fields) => onSaveCardFields(project.id, fields)}
            onApplyToAll={onApplyCardFieldsToAll}
            onResetToGlobal={
              isCardOverride && onResetCardFields
                ? () => onResetCardFields(project.id)
                : undefined
            }
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="relative h-full min-w-0">
        {cardLink}
        {settings}
      </div>
      {onSaveCardFields && (
        <OpportunityCardSettingsDialog
          open={customizeOpen}
          onOpenChange={setCustomizeOpen}
          fields={cardFields}
          canViewFinancialFields={canViewFinancialFields}
          title="Customize This Card"
          description="Choose and reorder fields for this opportunity only."
          saving={cardPreferenceSaving}
          onSave={(fields) => onSaveCardFields(project.id, fields)}
          onApplyToAll={onApplyCardFieldsToAll}
          onResetToGlobal={
            isCardOverride && onResetCardFields
              ? () => onResetCardFields(project.id)
              : undefined
          }
        />
      )}
    </>
  );
}

export const ProjectCard = memo(ProjectCardComponent);
ProjectCard.displayName = "ProjectCard";
