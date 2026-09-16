/** Date range used by Commercial Performance and metric from/to filters. */

export type ReportingPeriodKey = 'thisYear' | 'prevYear' | 'ytd' | 'custom';

export const REPORTING_PERIODS: { key: ReportingPeriodKey; label: string }[] = [
  { key: 'thisYear', label: 'This Year' },
  { key: 'prevYear', label: 'Previous Year' },
  { key: 'ytd', label: 'Year to Date' },
  { key: 'custom', label: 'Custom range' },
];

export interface ReportingRange {
  key: ReportingPeriodKey;
  label: string;
  from: string;
  to: string;
}

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function parseIsoDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

export function resolveReportingRange(
  key: ReportingPeriodKey,
  custom?: { from?: Date; to?: Date },
  now: Date = new Date()
): ReportingRange {
  const y = now.getFullYear();
  const label = REPORTING_PERIODS.find((p) => p.key === key)?.label ?? 'Custom range';

  if (key === 'thisYear') {
    return { key, label, from: `${y}-01-01`, to: `${y}-12-31` };
  }
  if (key === 'prevYear') {
    return { key, label, from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  }
  if (key === 'ytd') {
    return { key, label, from: `${y}-01-01`, to: iso(now) };
  }

  const from = custom?.from ? iso(custom.from) : `${y}-01-01`;
  const to = custom?.to ? iso(custom.to) : iso(now);
  return { key: 'custom', label, from, to };
}

/** Query-string fragment shared by cards and `/projects?metric=` drill-downs. */
export function reportingSearch(range: Pick<ReportingRange, 'from' | 'to'>): string {
  return `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

export function reportingParams(range: Pick<ReportingRange, 'from' | 'to'>): Record<string, string> {
  return { from: range.from, to: range.to };
}
