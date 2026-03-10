import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Currency = 'USD' | 'NGN';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  formatCurrency: (value: number) => string;
  formatCurrencyFor: (value: number, displayCurrency?: Currency) => string;
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

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
  };

  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'NGN' : 'USD');
  };

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

  const getContractValue = useCallback((project: { contractValueUSD?: number; contractValueNGN?: number }): number => {
    const usd = project.contractValueUSD || 0;
    const ngn = project.contractValueNGN || 0;

    if (currency === 'NGN') {
      if (ngn > 0) return ngn;
      if (usd > 0) {
        const converted = Math.round(usd * NGN_PER_USD);
        console.log('[Currency] Converting USD->NGN for contract value:', { usd, NGN_PER_USD, converted });
        return converted;
      }
      return 0;
    }

    // currency === 'USD'
    if (usd > 0) return usd;
    if (ngn > 0) {
      const converted = parseFloat((ngn / NGN_PER_USD).toFixed(2));
      console.log('[Currency] Converting NGN->USD for contract value:', { ngn, NGN_PER_USD, converted });
      return converted;
    }
    return 0;
  }, [currency]);

  const getMarginValue = useCallback((project: { marginValueUSD?: number; marginValueNGN?: number; marginPercentUSD?: number; marginPercentNGN?: number; contractValueUSD?: number; contractValueNGN?: number }): number => {
    // Prefer explicit margin values, otherwise fall back to percent * contract (with conversions if needed)
    const mUsd = project.marginValueUSD || 0;
    const mNgn = project.marginValueNGN || 0;

    if (currency === 'NGN') {
      if (mNgn > 0) return mNgn;
      // Try compute from percent
      const percent = project.marginPercentNGN ?? project.marginPercentUSD;
      const contract = getContractValue({ contractValueNGN: project.contractValueNGN, contractValueUSD: project.contractValueUSD });
      if (percent && contract > 0) {
        const calculated = Math.round(contract * (percent / 100));
        console.log('[Currency] Calculated NGN margin from percent:', { percent, contract, calculated });
        return calculated;
      }
      if (mUsd > 0) {
        const converted = Math.round(mUsd * NGN_PER_USD);
        console.log('[Currency] Converting USD->NGN for margin value:', { mUsd, NGN_PER_USD, converted });
        return converted;
      }
      return 0;
    }

    // currency === 'USD'
    if (mUsd > 0) return mUsd;
    const percent = project.marginPercentUSD ?? project.marginPercentNGN;
    const contract = getContractValue({ contractValueNGN: project.contractValueNGN, contractValueUSD: project.contractValueUSD });
    if (percent && contract > 0) {
      const calculated = parseFloat((contract * (percent / 100)).toFixed(2));
      console.log('[Currency] Calculated USD margin from percent:', { percent, contract, calculated });
      return calculated;
    }
    if (mNgn > 0) {
      const converted = parseFloat((mNgn / NGN_PER_USD).toFixed(2));
      console.log('[Currency] Converting NGN->USD for margin value:', { mNgn, NGN_PER_USD, converted });
      return converted;
    }
    return 0;
  }, [currency, NGN_PER_USD, getContractValue]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        toggleCurrency,
        formatCurrency,
        formatCurrencyFor,
        getContractValue,
        getMarginValue,
      }}
    >
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
