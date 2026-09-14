import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export type Currency = 'USD' | 'NGN';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  formatCurrency: (value: number) => string;
  formatCurrencyFor: (value: number, displayCurrency?: Currency) => string;
  /** Full numbers with grouping — no K/M/B abbreviations (exports, reports). */
  formatCurrencyFull: (value: number) => string;
  formatCurrencyFullFor: (value: number, displayCurrency?: Currency) => string;
  getContractValue: (project: { contractValueUSD?: number; contractValueNGN?: number }) => number;
  getMarginValue: (project: { marginValueUSD?: number; marginValueNGN?: number }) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    // Load from localStorage or default to USD
    const stored = localStorage.getItem('preferredCurrency');
    return (stored === 'NGN' || stored === 'USD') ? stored : 'USD';
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

  // Exchange rate used to convert between NGN and USD when one currency value is missing.
  // Configure via VITE_NGN_PER_USD (e.g., 800). Default to 800 if not set.
  const NGN_PER_USD = parseFloat(import.meta.env.VITE_NGN_PER_USD as string) || 800;

  const abbreviateValue = (value: number, symbol: string): string => {
    if (!value || value === 0) return `${symbol}0`;
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(2)}K`;
    return `${sign}${symbol}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrency = useCallback((value: number): string => {
    const symbol = currency === 'NGN' ? '₦' : '$';
    return abbreviateValue(value, symbol);
  }, [currency]);

  // Explicit formatter that allows specifying the display currency independent of user's selected currency
  const formatCurrencyFor = useCallback((value: number, displayCurrency?: Currency): string => {
    const useCurrency = displayCurrency ?? currency;
    const symbol = useCurrency === 'NGN' ? '₦' : '$';
    return abbreviateValue(value, symbol);
  }, [currency]);

  const fullValue = useCallback((value: number, symbol: string): string => {
    if (value === 0 || !Number.isFinite(value)) return `${symbol}0`;
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const getContractValue = useCallback((project: { contractValueUSD?: number; contractValueNGN?: number }): number => {
    const usd = project.contractValueUSD || 0;
    const ngn = project.contractValueNGN || 0;

    if (currency === 'NGN') {
      if (ngn > 0) return ngn;
      if (usd > 0) return Math.round(usd * NGN_PER_USD);
      return 0;
    }

    // currency === 'USD'
    if (usd > 0) return usd;
    if (ngn > 0) return parseFloat((ngn / NGN_PER_USD).toFixed(2));
    return 0;
  }, [currency, NGN_PER_USD]);

  const getMarginValue = useCallback((project: { marginValueUSD?: number; marginValueNGN?: number; marginPercentUSD?: number; marginPercentNGN?: number; contractValueUSD?: number; contractValueNGN?: number }): number => {
    // Prefer explicit margin values, otherwise fall back to percent * contract (with conversions if needed)
    const mUsd = project.marginValueUSD || 0;
    const mNgn = project.marginValueNGN || 0;

    if (currency === 'NGN') {
      if (mNgn > 0) return mNgn;
      // Try compute from percent
      const percent = project.marginPercentNGN ?? project.marginPercentUSD;
      const contract = getContractValue({ contractValueNGN: project.contractValueNGN, contractValueUSD: project.contractValueUSD });
      if (percent && contract > 0) return Math.round(contract * (percent / 100));
      if (mUsd > 0) return Math.round(mUsd * NGN_PER_USD);
      return 0;
    }

    // currency === 'USD'
    if (mUsd > 0) return mUsd;
    const percent = project.marginPercentUSD ?? project.marginPercentNGN;
    const contract = getContractValue({ contractValueNGN: project.contractValueNGN, contractValueUSD: project.contractValueUSD });
    if (percent && contract > 0) return parseFloat((contract * (percent / 100)).toFixed(2));
    if (mNgn > 0) return parseFloat((mNgn / NGN_PER_USD).toFixed(2));
    return 0;
  }, [currency, NGN_PER_USD, getContractValue]);

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
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
