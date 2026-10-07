import { Project } from '@/types';

type ContractLike = {
  contractValueNGN?: number | null;
  contractValueUSD?: number | null;
  contractValueNgn?: number | null;
  contractValueUsd?: number | null;
  discountedContractValueNGN?: number | null;
  discountedContractValueUSD?: number | null;
  discounted_contract_value_ngn?: number | null;
  discounted_contract_value_usd?: number | null;
};

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Original quoted contract (never overwritten by discount). */
export function originalContractNgn(p: ContractLike): number {
  return num(p.contractValueNGN ?? p.contractValueNgn) ?? 0;
}

export function originalContractUsd(p: ContractLike): number {
  return num(p.contractValueUSD ?? p.contractValueUsd) ?? 0;
}

/**
 * Effective contract for value KPIs / analytics:
 * discounted when present, else original.
 */
export function effectiveContractNgn(p: ContractLike): number {
  const discounted = num(
    p.discountedContractValueNGN ?? p.discounted_contract_value_ngn
  );
  if (discounted != null) return discounted;
  return originalContractNgn(p);
}

export function effectiveContractUsd(p: ContractLike): number {
  const discounted = num(
    p.discountedContractValueUSD ?? p.discounted_contract_value_usd
  );
  if (discounted != null) return discounted;
  return originalContractUsd(p);
}

export function hasDiscountNgn(p: ContractLike): boolean {
  return num(p.discountedContractValueNGN ?? p.discounted_contract_value_ngn) != null;
}

export function hasDiscountUsd(p: ContractLike): boolean {
  return num(p.discountedContractValueUSD ?? p.discounted_contract_value_usd) != null;
}

/** Margin base: discounted when set, else original. Same formula as forms. */
export function marginBaseNgn(p: ContractLike): number {
  return effectiveContractNgn(p);
}

export function marginBaseUsd(p: ContractLike): number {
  return effectiveContractUsd(p);
}

export function computeDiscountedContract(
  original: number,
  type: 'percent' | 'amount' | '' | null | undefined,
  value: number | null | undefined
): number | null {
  if (!type || value == null || !Number.isFinite(value) || value < 0) return null;
  if (!Number.isFinite(original) || original < 0) return null;
  if (type === 'percent') {
    const pct = Math.min(100, value);
    return Math.max(0, original * (1 - pct / 100));
  }
  return Math.max(0, original - value);
}

export function computeMarginValue(
  contractBase: number | null | undefined,
  marginPercent: number | null | undefined
): number | undefined {
  if (contractBase == null || marginPercent == null) return undefined;
  if (!Number.isFinite(contractBase) || !Number.isFinite(marginPercent)) return undefined;
  return (contractBase * marginPercent) / 100;
}

export type { Project };
