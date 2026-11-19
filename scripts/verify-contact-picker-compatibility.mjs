/**
 * Focused verification for shared contact-picker compatibility rules.
 * Mirrors src/lib/contactPickerCompatibility.ts (keep in sync when changing rules).
 */

const normalizeOrganization = (value) =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

function evaluateContactCompatibility(contact, relationship, organizationName) {
  const selectedOrg = normalizeOrganization(organizationName);
  const contactOrg = normalizeOrganization(contact.organizationName);
  const organizationMatch = Boolean(selectedOrg && contactOrg && selectedOrg === contactOrg);

  if (!contact.isActive) {
    return { eligible: false, reason: 'inactive', organizationMatch };
  }
  if (relationship === 'client' && contact.organizationType === 'partner') {
    return { eligible: false, reason: 'partner-on-project', organizationMatch };
  }
  if (relationship === 'partner' && contact.organizationType === 'client') {
    return { eligible: false, reason: 'client-on-partner', organizationMatch };
  }
  if (selectedOrg && contactOrg && selectedOrg !== contactOrg) {
    return { eligible: false, reason: 'org-mismatch', organizationMatch: false };
  }
  return { eligible: true, reason: null, organizationMatch };
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  } else {
    console.log('PASS:', message);
  }
}

const unclassified = {
  id: '1',
  isActive: true,
  organizationType: null,
  organizationName: null,
};
const partnerContact = {
  id: '2',
  isActive: true,
  organizationType: 'partner',
  organizationName: 'Partner Org',
};
const clientContact = {
  id: '3',
  isActive: true,
  organizationType: 'client',
  organizationName: 'Acme Energy',
};
const otherClient = {
  id: '4',
  isActive: true,
  organizationType: 'client',
  organizationName: 'Other Co',
};

assert(
  evaluateContactCompatibility(unclassified, 'client', '').eligible,
  'Empty organization: unclassified contact is eligible for projects',
);
assert(
  evaluateContactCompatibility(unclassified, 'partner', '').eligible,
  'Empty organization: unclassified contact is eligible for partners',
);
assert(
  !evaluateContactCompatibility(partnerContact, 'client', '').eligible,
  'Partner contact is incompatible with projects',
);
assert(
  !evaluateContactCompatibility(clientContact, 'partner', '').eligible,
  'Client contact is incompatible with partners',
);
assert(
  evaluateContactCompatibility(clientContact, 'client', 'Acme Energy').organizationMatch,
  'Matching organization is prioritized/marked',
);
assert(
  !evaluateContactCompatibility(otherClient, 'client', 'Acme Energy').eligible,
  'Nonmatching organization is explained as incompatible (not silently attachable)',
);
assert(
  evaluateContactCompatibility(clientContact, 'client', '').eligible,
  'Client contact remains selectable when organization is empty',
);

if (process.exitCode) {
  console.error('\nCompatibility verification failed.');
  process.exit(1);
}
console.log('\nAll contact-picker compatibility checks passed.');
