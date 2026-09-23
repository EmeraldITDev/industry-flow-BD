import { memo, type ReactNode } from "react";
import { Project, Sector, PIPELINE_STAGES } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sectorColors, sectorIcons, stageColors } from "@/data/mockData";
import { Calendar, MapPin, Users, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { format, isValid } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { getStageProgress } from "@/lib/stageProgress";

interface ProjectCardProps {
  project: Project;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
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
}: ProjectCardProps) {
  const { formatCurrency, getContractValue, getMarginValue } = useCurrency();

  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const completedTasks =
    project.completedTasksCount ??
    tasks.filter((t) => t.status === "completed").length;
  const tasksTotal = project.tasksCount ?? tasks.length;

  const stageLabel =
    PIPELINE_STAGES.find((s) => s.value === project.pipelineStage)?.label ||
    project.pipelineStage;

  const contractValue = getContractValue(project);
  const marginValue = getMarginValue(project);

  const products = (project.products?.length
    ? project.products
    : project.product
      ? [project.product]
      : []
  ).filter(Boolean);

  const subproducts = (project.subproducts?.length
    ? project.subproducts
    : project.subProduct
      ? [project.subProduct]
      : []
  ).filter(Boolean);

  const oem =
    project.oem && project.oem.toLowerCase() !== "n/a" ? project.oem : null;
  const description = project.description?.trim() || "";
  const deal =
    typeof project.dealProbability === "string"
      ? project.dealProbability.toLowerCase()
      : "";

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
        className={`p-3 sm:p-4 pb-2 ${selectable ? "pl-9" : ""}`}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md font-medium truncate max-w-[10rem] sm:max-w-[14rem] ${sectorColors[project.businessVertical as Sector] || "bg-muted text-muted-foreground"}`}
            >
              {sectorIcons[project.businessVertical as Sector] || "📁"}{" "}
              <span className="hidden sm:inline">
                {project.businessVertical || "Unassigned"}
              </span>
            </span>

            <Badge
              variant="outline"
              className={`text-[10px] sm:text-xs capitalize ${statusColors[project.status] || ""}`}
            >
              {String(project.status || "").replace(/_/g, "-")}
            </Badge>
          </div>
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
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <Badge
            variant="outline"
            className={`text-[10px] sm:text-xs ${stageColors[project.pipelineStage] || ""}`}
          >
            {stageLabel}
          </Badge>
          {deal && (
            <Badge
              variant="outline"
              className={`text-[10px] sm:text-xs capitalize ${probabilityColors[deal] || ""}`}
            >
              {deal} prob.
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-2.5 sm:space-y-3 min-w-0">
        {(project.clientName || project.clientContact) && (
          <div className="min-w-0 space-y-0.5">
            {project.clientName && (
              <p className="text-xs sm:text-sm font-medium truncate">
                {project.clientName}
              </p>
            )}
            {project.clientContact && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Contact: {project.clientContact}
              </p>
            )}
          </div>
        )}

        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 break-words">
            {description}
          </p>
        )}

        {/* Compact opportunity facts — only render rows that have values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 min-w-0">
          {project.location && (
            <MetaRow label="Location">
              <span className="inline-flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{project.location}</span>
              </span>
            </MetaRow>
          )}
          {project.sector && (
            <MetaRow label="Sector">{project.sector}</MetaRow>
          )}
          {oem && <MetaRow label="OEM">{oem}</MetaRow>}
          {project.salesLead && (
            <MetaRow label="Sales">{project.salesLead}</MetaRow>
          )}
          {project.channelPartner && (
            <MetaRow label="Partner">{project.channelPartner}</MetaRow>
          )}
        </div>

        {(products.length > 0 || subproducts.length > 0) && (
          <div className="flex flex-wrap gap-1 min-w-0 overflow-hidden max-h-[3.25rem]">
            {products.slice(0, 3).map((p) => (
              <Badge
                key={`p-${p}`}
                variant="secondary"
                className="text-[10px] font-normal max-w-[9rem] truncate"
              >
                {p}
              </Badge>
            ))}
            {products.length > 3 && (
              <Badge variant="outline" className="text-[10px] font-normal">
                +{products.length - 3}
              </Badge>
            )}
            {subproducts.slice(0, 2).map((p) => (
              <Badge
                key={`s-${p}`}
                variant="outline"
                className="text-[10px] font-normal max-w-[9rem] truncate"
              >
                {p}
              </Badge>
            ))}
          </div>
        )}

        {(contractValue > 0 || marginValue > 0) && (
          <div className="flex flex-col gap-0.5 text-[10px] sm:text-xs min-w-0">
            {contractValue > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Contract</span>
                <span className="font-medium truncate">
                  {formatCurrency(contractValue)}
                </span>
              </div>
            )}
            {marginValue > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Margin</span>
                <span className="font-medium text-chart-2 truncate">
                  {formatCurrency(marginValue)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {getStageProgress(project.pipelineStage, project.progress)}%
            </span>
          </div>
          <Progress
            value={getStageProgress(project.pipelineStage, project.progress)}
            className="h-1.5"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground pt-2 border-t border-border gap-2 min-w-0">
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{project.teamSize || 0}</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>
              {completedTasks}/{tasksTotal}
            </span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 truncate">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">
              {safeFormatDate(project.startDate, "MMM d")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (selectable) {
    return (
      <div
        onClick={() => onSelectToggle?.(project.id)}
        className="cursor-pointer min-w-0"
      >
        {card}
      </div>
    );
  }

  return (
    <Link to={`/projects/${project.id}`} className="min-w-0 block">
      {card}
    </Link>
  );
}

export const ProjectCard = memo(ProjectCardComponent);
ProjectCard.displayName = "ProjectCard";
