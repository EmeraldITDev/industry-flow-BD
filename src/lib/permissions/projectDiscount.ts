import { User } from '@/types/auth';

/**
 * Emails allowed to set/clear project discounts.
 * Mirrors App\Support\ProjectDiscount::SETTER_EMAILS on the backend.
 */
export const PROJECT_DISCOUNT_SETTERS = [
  'chiemela.ikechi@emeraldcfze.com',
  'ojinika.odocha@emeraldcfze.com',
] as const;

export function canSetProjectDiscount(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  const email = user.email.trim().toLowerCase();
  return (PROJECT_DISCOUNT_SETTERS as readonly string[]).includes(email);
}
