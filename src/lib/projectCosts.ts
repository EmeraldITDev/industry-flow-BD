export type ProjectCurrency = 'NGN' | 'USD';

export function isProjectCurrency(value: unknown): value is ProjectCurrency {
  return value === 'NGN' || value === 'USD';
}

export function projectCostSummary(
  contractBase: number | null,
  supplierDirectCost: number | null,
  otherProjectCost: number | null
): {
  totalProjectCost: number | null;
  marginValue: number | null;
  marginPercent: number | null;
} {
  const hasCost = supplierDirectCost != null || otherProjectCost != null;
  if (!hasCost) {
    return { totalProjectCost: null, marginValue: null, marginPercent: null };
  }

  const total = (supplierDirectCost ?? 0) + (otherProjectCost ?? 0);
  if (contractBase == null || !Number.isFinite(contractBase)) {
    return { totalProjectCost: total, marginValue: null, marginPercent: null };
  }

  const marginValue = contractBase - total;
  const marginPercent = contractBase > 0 ? (marginValue / contractBase) * 100 : null;
  return { totalProjectCost: total, marginValue, marginPercent };
}
