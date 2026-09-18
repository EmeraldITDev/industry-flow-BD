import { User } from '@/types/auth';

/**
 * Emails that may access the Chairman's Executive View.
 * Admins and other roles are intentionally excluded — add addresses explicitly.
 */
export const EXECUTIVE_EMAILS = [
  'lazarus.angbazo@emeraldcfze.com',
  'chiemela.ikechi@emeraldcfze.com',
];

/**
 * Only these emails get the restricted operational UX (limited sidebar, no All Tasks).
 * Other EXECUTIVE_EMAILS still see Chairman's View but keep their normal nav.
 */
export const RESTRICTED_EXECUTIVE_EMAILS = ['lazarus.angbazo@emeraldcfze.com'];

export function canViewExecutive(user: User | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  return EXECUTIVE_EMAILS.includes(email);
}

/**
 * Restricted operational UX for the primary chairman email (sidebar, dashboard,
 * calendar, /tasks).
 */
export function isRestrictedExecutiveUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  return RESTRICTED_EXECUTIVE_EMAILS.includes(email);
}

/** Default post-login / home path for the signed-in user. */
export function homePathForUser(user: User | null | undefined): string {
  return isRestrictedExecutiveUser(user) ? '/executive' : '/';
}
