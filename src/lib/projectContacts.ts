import type { ProjectContact } from "@/types";

export function validateProjectContacts(contacts: ProjectContact[]): string | null {
  if (contacts.length === 0) return null;
  if (contacts.filter((contact) => contact.isPrimary).length !== 1) {
    return "Select exactly one primary contact.";
  }

  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const contact of contacts) {
    const name = contact.name.trim();
    const email = contact.email.trim().toLowerCase();
    const phone = contact.phone.trim();
    const isLegacyWithoutName = Boolean(contact.id && !name && (email || phone));

    if (!name && !isLegacyWithoutName) return "Enter a full name for each contact.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return `Enter a valid email address for ${name || "the legacy contact"}.`;
    }
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      if (!/^\+?[0-9\s().-]{7,25}$/.test(phone) || digits.length < 7 || digits.length > 20) {
        return `Enter a valid phone number for ${name || "the legacy contact"}.`;
      }
      if (phones.has(digits)) return "A contact with this phone number is already assigned to the project.";
      phones.add(digits);
    }
    if (email) {
      if (emails.has(email)) return "A contact with this email is already assigned to the project.";
      emails.add(email);
    }
  }

  return null;
}
