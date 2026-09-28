import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export type Currency = 'USD' | 'NGN';

type ContractFields = {
  contractValueUSD?: number | null;
  contractValueNGN?: number | null;
};

type MarginFields = ContractFields & {
  marginValueUSD?: number | null;
  marginValueNGN?: number | null;
  marginPercentUSD?: number | null;
  marginPercentNGN?: number | null;
};

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  formatCurrency: (value: number) => string;
  formatCurrencyFor: (value: number, displayCurrency?: Currency) => string;
  /** Full numbers with grouping — no K/M/B abbreviations (exports, reports). */
  formatCurrencyFull: (value: number) => string;
  formatCurrencyFullFor: (value: number, displayCurrency?: Currency) => string;
  /**
   * Stored contract value for the active display currency only.
   * Returns null when that currency is missing — never invents via FX.
   */
  getContractValue: (project: ContractFields) => number | null;
  /**
   * Stored margin for the active display currency only.
   * May use same-currency percent × same-currency contract; never cross-converts.
   */
  getMarginValue: (project: MarginFields) => number | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

function positive(n: unknown): number | null {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const stored = localStorage.getItem('preferredCurrency');
    return stored === 'NGN' || stored === 'USD' ? stored : 'USD';
  });

  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrencyState((prev) => {
      const next = prev === 'USD' ? 'NGN' : 'USD';
      localStorage.setItem('preferredCurrency', next);
      return next;
    });
  }, []);

  const abbreviateValue = (value: number, symbol: string): string => {
    if (!value || value === 0) return `${symbol}0`;
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(2)}K`;
    return `${sign}${symbol}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrency = useCallback(
    (value: number): string => {
      const symbol = currency === 'NGN' ? '₦' : '$';
      return abbreviateValue(value, symbol);
    },
    [currency]
  );

  const formatCurrencyFor = useCallback(
    (value: number, displayCurrency?: Currency): string => {
      const useCurrency = displayCurrency ?? currency;
      const symbol = useCurrency === 'NGN' ? '₦' : '$';
      return abbreviateValue(value, symbol);
    },
    [currency]
  );

  const fullValue = useCallback((value: number, symbol: string): string => {
    if (value === 0 || !Number.isFinite(value)) return `${symbol}0`;
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const formatted = abs.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}${symbol}${formatted}`;
  }, []);

  const formatCurrencyFull = useCallback(
    (value: number): string => {
      const symbol = currency === 'NGN' ? '₦' : '$';
      return fullValue(value, symbol);
    },
    [currency, fullValue]
  );

  const formatCurrencyFullFor = useCallback(
    (value: number, displayCurrency?: Currency): string => {
      const useCurrency = displayCurrency ?? currency;
      const symbol = useCurrency === 'NGN' ? '₦' : '$';
      return fullValue(value, symbol);
    },
    [currency, fullValue]
  );

  const getContractValue = useCallback(
    (project: ContractFields): number | null => {
      if (currency === 'NGN') return positive(project.contractValueNGN);
      return positive(project.contractValueUSD);
    },
    [currency]
  );

  const getMarginValue = useCallback(
    (project: MarginFields): number | null => {
      if (currency === 'NGN') {
        const stored = positive(project.marginValueNGN);
        if (stored != null) return stored;
        const percent = positive(project.marginPercentNGN);
        const contract = positive(project.contractValueNGN);
        if (percent != null && contract != null) {
          return Math.round(contract * (percent / 100));
        }
        return null;
      }

      const stored = positive(project.marginValueUSD);
      if (stored != null) return stored;
      const percent = positive(project.marginPercentUSD);
      const contract = positive(project.contractValueUSD);
      if (percent != null && contract != null) {
        return parseFloat((contract * (percent / 100)).toFixed(2));
      }
      return null;
    },
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      toggleCurrency,
      formatCurrency,
      formatCurrencyFor,
      formatCurrencyFull,
      formatCurrencyFullFor,
      getContractValue,
      getMarginValue,
    }),
    [
      currency,
      setCurrency,
      toggleCurrency,
      formatCurrency,
      formatCurrencyFor,
      formatCurrencyFull,
      formatCurrencyFullFor,
      getContractValue,
      getMarginValue,
    ]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

/** Display helper: missing stored value → em dash. */
export function formatOrDash(
  value: number | null | undefined,
  format: (n: number) => string
): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  return format(value);
}
