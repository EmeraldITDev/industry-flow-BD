import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';

interface DashboardExportContextValue {
  /** When true, currency and chart formatters use full numbers (for PNG/PDF capture). */
  exportFullNumbers: boolean;
  setExportFullNumbers: (v: boolean) => void;
}

const DashboardExportContext = createContext<DashboardExportContextValue | undefined>(undefined);

export function DashboardExportProvider({ children }: { children: ReactNode }) {
  const [exportFullNumbers, setExportFullNumbers] = useState(false);

  const value = useMemo(
    () => ({ exportFullNumbers, setExportFullNumbers }),
    [exportFullNumbers]
  );

  return (
    <DashboardExportContext.Provider value={value}>{children}</DashboardExportContext.Provider>
  );
}

export function useDashboardExport() {
  const ctx = useContext(DashboardExportContext);
  if (!ctx) {
    throw new Error('useDashboardExport must be used within DashboardExportProvider');
  }
  return ctx;
}

/** Safe for components used outside Dashboard (e.g. RevenueAnalytics in tests). */
export function useDashboardExportOptional(): DashboardExportContextValue | null {
  return useContext(DashboardExportContext) ?? null;
}

export async function withExportFullNumbers<T>(
  setExportFullNumbers: (v: boolean) => void,
  fn: () => Promise<T>
): Promise<T> {
  setExportFullNumbers(true);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 120);
      });
    });
  });
  try {
    return await fn();
  } finally {
    setExportFullNumbers(false);
  }
}
