/** Currency-safe executive formatting. USD and NGN are never combined. */

const compact = (value: number, symbol: string): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (!value) return `${symbol}0`;
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${symbol}${Math.round(abs).toLocaleString()}`;
};

export const fmtUsd = (v: number) => compact(v || 0, '$');
export const fmtNgn = (v: number) => compact(v || 0, '₦');
export const fmtPercent = (v: number) => `${Math.round((v || 0) * 100)}%`;

export const fmtDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDelta = (current: number, previous: number): string => {
  const diff = current - previous;
  if (!diff) return 'No change vs previous period';
  return `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)} vs previous period`;
};

export const fmtMonthLabel = (key: string): string => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return isNaN(d.getTime()) ? key : d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};
