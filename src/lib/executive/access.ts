import { User } from '@/types/auth';

/**
 * Only these emails may access the Chairman's Executive View.
 * Admins and other roles are intentionally excluded — except users
 * explicitly assigned the Chairman system role.
 */
export const EXECUTIVE_EMAILS = ['lazarus.angbazo@emeraldcfze.com'];

export function canViewExecutive(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.systemRole === 'chairman') return true;
  const email = (user.email || '').trim().toLowerCase();
  return EXECUTIVE_EMAILS.includes(email);
}

/** Default post-login / home path for the signed-in user. */
export function homePathForUser(user: User | null | undefined): string {
  return canViewExecutive(user) ? '/executive' : '/';
}
