import type { ContactSummary, ContactType } from '@/services/contacts';

export type ContactCompatibility = {
  eligible: boolean;
  reason: string | null;
  organizationMatch: boolean;
};

const normalizeOrganization = (value?: string | null): string =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Mirrors ProjectController / PartnerController attach validation so the
 * picker can explain incompatibility instead of silently hiding contacts.
 */
export function evaluateContactCompatibility(
  contact: ContactSummary,
  relationship: ContactType,
  organizationName?: string | null,
): ContactCompatibility {
  const selectedOrg = normalizeOrganization(organizationName);
  const contactOrg = normalizeOrganization(contact.organizationName);
  const organizationMatch = Boolean(selectedOrg && contactOrg && selectedOrg === contactOrg);

  if (!contact.isActive) {
    return { eligible: false, reason: 'This contact is inactive.', organizationMatch };
  }

  if (relationship === 'client' && contact.organizationType === 'partner') {
    return {
      eligible: false,
      reason: 'Partner contacts cannot be attached to a project. Choose a client contact, or create a new one.',
      organizationMatch,
    };
  }

  if (relationship === 'partner' && contact.organizationType === 'client') {
    return {
      eligible: false,
      reason: 'Client contacts cannot be attached to a partner. Choose a partner contact, or create a new one.',
      organizationMatch,
    };
  }

  if (selectedOrg && contactOrg && selectedOrg !== contactOrg) {
    return {
      eligible: false,
      reason: relationship === 'client'
        ? 'This contact belongs to a different client organization.'
        : 'This contact belongs to a different partner organization.',
      organizationMatch: false,
    };
  }

  return { eligible: true, reason: null, organizationMatch };
}
