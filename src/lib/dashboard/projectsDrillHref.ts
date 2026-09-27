import { DashboardFilterState } from '@/components/dashboard/DashboardFilters';
import { endOfMonth, startOfMonth, parseISO } from 'date-fns';

export type TeamMemberRef = { id: string | number; name: string };

/** Overrides replace the same key from the dashboard filter bar (drill axis). */
export type ProjectsDrillOverrides = {
  metric?: string;
  statuses?: string[];
  pipelineStages?: string[];
  sectors?: string[];
  businessSegments?: string[];
  businessVerticals?: string[];
  products?: string[];
  subproducts?: string[];
  clientNames?: string[];
  /** Prefer team member IDs (Projects AdvancedFilters). */
  projectLeads?: string[];
  assignees?: string[];
  channelPartners?: string[];
  partner_id?: string;
  /** When set, skip mapping dashboard startDates → dateFrom/dateTo. */
  dateFrom?: string;
  dateTo?: string;
};

function setJsonArray(params: URLSearchParams, key: string, values: string[] | undefined) {
  if (values && values.length > 0) {
    params.set(key, JSON.stringify(values));
  }
}

/** Resolve lead display names (dashboard filter bar) → team member IDs for Projects. */
export function resolveLeadIds(
  names: string[],
  teamMembers: TeamMemberRef[] = []
): string[] {
  if (names.length === 0) return [];
  const byName = new Map<string, string>();
  teamMembers.forEach((m) => {
    const name = (m.name || '').trim().toLowerCase();
    if (name) byName.set(name, String(m.id));
  });
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name || name === 'Unassigned') continue;
    const id = byName.get(name.toLowerCase());
    if (id) ids.push(id);
    else ids.push(name); // backend may match sales_lead / name fallback
  }
  return ids;
}

/**
 * Build a `/projects?…` href that preserves the dashboard filter bar and
 * applies click-triggered overrides. Matches the Projects list URL pattern
 * (JSON array params + optional metric= drill).
 */
export function projectsDrillHref(
  filters: DashboardFilterState,
  overrides: ProjectsDrillOverrides = {},
  teamMembers: TeamMemberRef[] = []
): string {
  const params = new URLSearchParams();

  if (overrides.metric) {
    params.set('metric', overrides.metric);
  }

  const leadIds =
    overrides.projectLeads ??
    resolveLeadIds(filters.projectLeads, teamMembers);

  setJsonArray(params, 'projectLeads', leadIds);
  setJsonArray(
    params,
    'pipelineStages',
    overrides.pipelineStages ?? filters.pipelineStages
  );
  setJsonArray(
    params,
    'businessSegments',
    overrides.businessSegments ?? filters.businessSegments
  );
  setJsonArray(params, 'clientNames', overrides.clientNames ?? filters.clients);
  setJsonArray(params, 'products', overrides.products ?? filters.products);
  setJsonArray(params, 'subproducts', overrides.subproducts ?? filters.subProducts);
  setJsonArray(
    params,
    'channelPartners',
    overrides.channelPartners ?? filters.channelPartners
  );

  setJsonArray(params, 'statuses', overrides.statuses);
  setJsonArray(params, 'sectors', overrides.sectors);
  setJsonArray(params, 'businessVerticals', overrides.businessVerticals);
  setJsonArray(params, 'assignees', overrides.assignees);

  if (overrides.partner_id) {
    params.set('partner_id', overrides.partner_id);
  }

  if (overrides.dateFrom) params.set('dateFrom', overrides.dateFrom);
  if (overrides.dateTo) params.set('dateTo', overrides.dateTo);

  // Map dashboard start-date months → Projects date range when not overridden
  if (!overrides.dateFrom && !overrides.dateTo && filters.startDates.length > 0) {
    const months = [...filters.startDates].sort();
    try {
      const from = startOfMonth(parseISO(`${months[0]}-01`));
      const to = endOfMonth(parseISO(`${months[months.length - 1]}-01`));
      params.set('dateFrom', from.toISOString());
      params.set('dateTo', to.toISOString());
    } catch {
      // ignore invalid month strings
    }
  }

  const qs = params.toString();
  return qs ? `/projects?${qs}` : '/projects';
}
