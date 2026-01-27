import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Currency = 'USD' | 'NGN';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  formatCurrency: (value: number) => string;
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

  const formatCurrency = (value: number): string => {
    if (!value || value === 0) return currency === 'NGN' ? '₦0' : '$0';
    const symbol = currency === 'NGN' ? '₦' : '$';
    if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`;
    return `${symbol}${value.toLocaleString()}`;
  };

  const getContractValue = (project: { contractValueUSD?: number; contractValueNGN?: number }): number => {
    return currency === 'NGN' ? (project.contractValueNGN || 0) : (project.contractValueUSD || 0);
  };

  const getMarginValue = (project: { marginValueUSD?: number; marginValueNGN?: number }): number => {
    return currency === 'NGN' ? (project.marginValueNGN || 0) : (project.marginValueUSD || 0);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        toggleCurrency,
        formatCurrency,
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
