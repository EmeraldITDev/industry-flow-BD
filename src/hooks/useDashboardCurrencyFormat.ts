import { useCurrency, type Currency } from '@/context/CurrencyContext';
import { useDashboardExportOptional } from '@/context/DashboardExportContext';

export type { Currency };

export function useDashboardCurrencyFormat() {
  const { formatCurrency, formatCurrencyFor, formatCurrencyFull, formatCurrencyFullFor } = useCurrency();
  const dash = useDashboardExportOptional();
  const full = dash?.exportFullNumbers ?? false;

  return {
    /** Use for dashboard values that may abbreviate (K/M/B) unless exporting. */
    formatCurrency: (value: number) => (full ? formatCurrencyFull(value) : formatCurrency(value)),
    formatCurrencyFor: (value: number, displayCurrency?: Currency) =>
      full ? formatCurrencyFullFor(value, displayCurrency) : formatCurrencyFor(value, displayCurrency),
    exportFullNumbers: full,
  };
}
