import { User } from '@/types/auth';

/**
 * Only these emails may access the Chairman's Executive View.
 * Admins and other roles are intentionally excluded.
 */
export const EXECUTIVE_EMAILS = ['lazarus.angbazo@emeraldcfze.com'];

export function canViewExecutive(user: User | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  return EXECUTIVE_EMAILS.includes(email);
}

/**
 * Restricted operational UX for the executive email (sidebar, dashboard,
 * calendar, /tasks). Same allowlist as Chairman's View access.
 */
export function isRestrictedExecutiveUser(user: User | null | undefined): boolean {
  return canViewExecutive(user);
}

/** Default post-login / home path for the signed-in user. */
export function homePathForUser(user: User | null | undefined): string {
  return canViewExecutive(user) ? '/executive' : '/';
}
