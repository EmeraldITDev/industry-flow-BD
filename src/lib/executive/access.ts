import { User } from '@/types/auth';

/**
 * Emails explicitly authorised for the Chairman's Executive View, in addition
 * to any user holding the Admin system role.
 */
export const EXECUTIVE_EMAILS = [
  'lazarus.angbazo@emeraldcfze.com',
  'lazarus@emeraldcfze.com',
];

export function canViewExecutive(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.systemRole === 'admin' || user.accessLevel === 'admin') return true;

  const email = (user.email || '').trim().toLowerCase();
  if (email && EXECUTIVE_EMAILS.includes(email)) return true;

  // Identity fallback — Chairman accounts have varied slightly in the DB over time.
  if (email.endsWith('@emeraldcfze.com')) {
    if (email.includes('lazarus') || email.includes('angbazo')) return true;
  }

  const name = (user.name || '').trim().toLowerCase();
  if (name.includes('lazarus') && name.includes('angbazo')) return true;

  return false;
}

/** Default post-login / home path for the signed-in user. */
export function homePathForUser(user: User | null | undefined): string {
  return canViewExecutive(user) ? '/executive' : '/';
}
