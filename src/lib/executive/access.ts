import { User } from '@/types/auth';

/**
 * Emails explicitly authorised for the Chairman's Executive View, in addition
 * to any user holding the Admin system role.
 */
export const EXECUTIVE_EMAILS = ['lazarus.angbazo@emeraldcfze.com'];

export function canViewExecutive(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.systemRole === 'admin' || user.accessLevel === 'admin') return true;
  return EXECUTIVE_EMAILS.includes((user.email || '').trim().toLowerCase());
}
