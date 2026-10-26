import { memo, useState, type ReactNode } from "react";
import { Project, Sector, PIPELINE_STAGES } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sectorIcons, stageColors } from "@/data/mockData";
import { MoreHorizontal } from "lucide-react";
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
    <div className="min-w-0 flex items-baseline gap-1.5 text-[10px] sm:text-xs">
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
  onResetCardFields,
}: ProjectCardProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
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
        <div key={field} className="col-span-full space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
            <span className="text-muted-foreground">{option.label}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      );
    }

    if (field === "taskSummary") {
      return (
        <MetaRow key={field} label="Tasks">
          {value}
        </MetaRow>
      );
    }

    if (field === "description") {
      return (
        <div key={field} className="col-span-full min-w-0">
          <p className="text-[10px] text-muted-foreground">{option.label}</p>
          <p className="text-xs text-foreground/90 line-clamp-2 break-words">{value}</p>
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
      className={`hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${selected ? "border-primary ring-2 ring-primary/20" : ""}`}
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
        className={`p-3 sm:p-4 pb-2 ${selectable ? "pl-9" : ""} ${onSaveCardFields ? "pr-12" : ""}`}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0" />
          {project.projectImage && (
            <img
              src={project.projectImage}
              alt=""
              className="w-8 h-8 sm:w-9 sm:h-9 rounded object-contain border border-border shrink-0"
            />
          )}
        </div>
        <h3 className="font-semibold text-sm sm:text-base mt-1.5 group-hover:text-primary transition-colors line-clamp-2 break-words">
          {project.name}
        </h3>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-2.5 sm:space-y-3 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 min-w-0">
          {selectedFields.map(renderField)}
        </div>
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
      className="cursor-pointer min-w-0"
    >
      {card}
    </div>
  ) : (
    <Link to={`/projects/${project.id}`} className="min-w-0 block">
      {card}
    </Link>
  );

  if (selectable) {
    return (
      <>
        <div className="relative min-w-0">
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
      <div className="relative min-w-0">
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
