import { addDays, addMonths, addWeeks, isValid } from 'date-fns';

export type LeadDuration = {
  amount: number;
  unit: 'days' | 'weeks' | 'months';
};

const UNITS: Record<string, LeadDuration['unit']> = {
  day: 'days',
  days: 'days',
  week: 'weeks',
  weeks: 'weeks',
  wk: 'weeks',
  wks: 'weeks',
  month: 'months',
  months: 'months',
  mo: 'months',
  mos: 'months',
};

/**
 * Lead time is a duration such as "8 weeks" or "8–12 weeks".
 * A range uses the longer duration. A bare number is treated as weeks.
 */
export function parseLeadTime(raw: string | null | undefined): LeadDuration | null {
  if (!raw) return null;
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ');
  if (!text) return null;

  const match = text.match(
    /^(\d+(?:\.\d+)?)(?:\s*(?:-|to)\s*(\d+(?:\.\d+)?))?(?:\s*(days?|weeks?|wks?|months?|mos?))?$/
  );
  if (!match) return null;

  const first = Number(match[1]);
  const second = match[2] != null ? Number(match[2]) : first;
  if (!Number.isFinite(first) || !Number.isFinite(second) || first < 0 || second < 0) {
    return null;
  }

  const amount = Math.max(first, second);
  if (amount <= 0) return null;

  const unit = match[3] ? UNITS[match[3]] : 'weeks';
  if (!unit) return null;
  return { amount, unit };
}

/** Approved/Won Date + Lead Time. Null when the lead time is not a duration. */
export function addLeadTime(
  winDate: Date | null | undefined,
  leadTime: string | null | undefined
): Date | null {
  if (!winDate || !isValid(winDate)) return null;
  const duration = parseLeadTime(leadTime);
  if (!duration) return null;

  const whole = Math.floor(duration.amount);
  const fraction = duration.amount - whole;

  if (duration.unit === 'days') {
    return addDays(winDate, Math.round(duration.amount));
  }
  if (duration.unit === 'months') {
    const date = addMonths(winDate, whole);
    return fraction ? addDays(date, Math.round(fraction * 30)) : date;
  }
  const date = addWeeks(winDate, whole);
  return fraction ? addDays(date, Math.round(fraction * 7)) : date;
}
