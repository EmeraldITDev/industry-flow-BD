import { User } from '@/types/auth';

/**
 * Only this email may set/clear "Requires chairman intervention" on tasks.
 * Kept in one place so it can later become role-based without hunting call sites.
 */
export const CHAIRMAN_INTERVENTION_SETTERS = [
  'chiemela.ikechi@emeraldcfze.com',
] as const;

export function canSetChairmanIntervention(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  const email = user.email.trim().toLowerCase();
  return (CHAIRMAN_INTERVENTION_SETTERS as readonly string[]).includes(email);
}
