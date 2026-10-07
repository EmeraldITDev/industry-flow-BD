import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { PIPELINE_STAGES } from "@/types";
import { projectsService, type ProjectActivityEvent } from "@/services/projects";

const FIELD_LABELS: Record<string, string> = {
  pipeline_stage: "Pipeline Stage",
  status: "Status",
  risk_level: "Deal Probability",
  contract_value_ngn: "Contract Value (NGN)",
  contract_value_usd: "Contract Value (USD)",
  margin_percent_ngn: "Margin % (NGN)",
  margin_percent_usd: "Margin % (USD)",
  margin_value_ngn: "Margin Value (NGN)",
  margin_value_usd: "Margin Value (USD)",
  project_lead_id: "Project Lead",
  assignee_id: "Assignee",
  expected_close_date: "Expected Close Date",
  start_date: "Start Date",
  end_date: "End Date",
  pipeline_intake_date: "Pipeline Intake Date",
  name: "Project Name",
  client_name: "Client Name",
  products: "Products",
};

function stageLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const match = PIPELINE_STAGES.find((s) => s.value === value);
  if (match) return match.label;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayValue(event: ProjectActivityEvent, raw: string | null): string {
  if (raw == null || raw === "") return "—";
  if (event.fieldName === "pipeline_stage") return stageLabel(raw);
  if (event.fieldName === "status" || event.fieldName === "risk_level") {
    return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return raw;
}

function formatSentence(event: ProjectActivityEvent): string {
  const actor = event.actor?.name?.trim() || "Someone";
  if (event.eventType === "created") {
    return `${actor} created this project`;
  }

  const label =
    FIELD_LABELS[event.fieldName ?? ""] ||
    (event.fieldName || "a field").replace(/_/g, " ");
  const from = displayValue(event, event.oldValue);
  const to = displayValue(event, event.newValue);

  if (from === "—" && to !== "—") {
    return `${actor} set ${label} to ${to}`;
  }
  if (from !== "—" && to === "—") {
    return `${actor} cleared ${label} (was ${from})`;
  }
  return `${actor} changed ${label} from ${from} to ${to}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function ProjectActivitySection({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: () => projectsService.getActivity(projectId),
    enabled: Boolean(projectId),
  });

  const events = data ?? [];

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <History className="h-4 w-4 text-primary" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load activity for this project.
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No field changes recorded yet. Edits to stage, values, owners, and
            dates will appear here.
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="text-sm leading-snug border-l-2 border-border pl-3"
              >
                <p>
                  {formatSentence(event)}
                  {event.occurredAt ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {relativeTime(event.occurredAt)}
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
