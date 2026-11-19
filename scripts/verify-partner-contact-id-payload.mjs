/**
 * Focused check that partner contact serialization keeps canonical IDs.
 * Mirrors industry-flow-BD/src/services/partners.ts toPayload contact mapping.
 */

function serializeContacts(rows) {
  return rows.map((row) => {
    const contactId = row.contactId?.trim() || undefined;
    return {
      id: row.id,
      ...(contactId ? { contact_id: contactId, contactId } : {}),
      name: row.name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      title: row.title ?? null,
      is_primary: Boolean(row.isPrimary),
      isPrimary: Boolean(row.isPrimary),
    };
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  } else {
    console.log('PASS:', message);
  }
}

const withCanonical = serializeContacts([
  {
    id: 'legacy-row-1',
    contactId: '11111111-1111-1111-1111-111111111111',
    name: 'Ada',
    email: 'ada@example.test',
    isPrimary: true,
  },
]);

assert(withCanonical[0].contact_id === '11111111-1111-1111-1111-111111111111', 'contact_id is included for API');
assert(withCanonical[0].contactId === '11111111-1111-1111-1111-111111111111', 'contactId camelCase retained');
assert(withCanonical[0].id === 'legacy-row-1', 'legacy row id preserved');

const withoutCanonical = serializeContacts([
  { id: 'legacy-row-2', name: 'No Directory', isPrimary: true },
]);
assert(!('contact_id' in withoutCanonical[0]), 'omits contact_id when unset');
assert(withoutCanonical[0].id === 'legacy-row-2', 'legacy-only row still serializes');

if (process.exitCode) {
  console.error('\nPartner contact_id payload verification failed.');
  process.exit(1);
}
console.log('\nAll partner contact_id payload checks passed.');
