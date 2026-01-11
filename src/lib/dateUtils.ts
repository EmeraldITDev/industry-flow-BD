import { format, isValid } from 'date-fns';

/**
 * Safely formats a date string or Date object, handling null/undefined values
 * @param dateInput - Date string, Date object, or null/undefined
 * @param formatStr - date-fns format string (default: 'MMM d, yyyy')
 * @param fallback - Value to return if date is invalid (default: 'N/A')
 */
export function safeFormatDate(
  dateInput: string | Date | null | undefined,
  formatStr: string = 'MMM d, yyyy',
  fallback: string = 'N/A'
): string {
  if (!dateInput) return fallback;
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return isValid(date) ? format(date, formatStr) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Simple date formatter that splits ISO string and returns date portion
 * @param dateString - ISO date string or null/undefined
 * @param fallback - Value to return if date is invalid (default: 'N/A')
 */
export function formatDateSimple(
  dateString: string | null | undefined,
  fallback: string = 'N/A'
): string {
  if (!dateString) return fallback;
  
  try {
    return dateString.split('T')[0];
  } catch {
    return fallback;
  }
}

/**
 * Checks if a date is in the past (overdue)
 * @param dateInput - Date string, Date object, or null/undefined
 */
export function isOverdue(dateInput: string | Date | null | undefined): boolean {
  if (!dateInput) return false;
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return isValid(date) && date < new Date();
  } catch {
    return false;
  }
}
