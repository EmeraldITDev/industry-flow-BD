import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Parse user-entered numbers from strings that may contain commas or currency symbols.
export function parseNumberInput(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const cleaned = String(value).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}
