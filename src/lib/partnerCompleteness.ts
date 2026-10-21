import type { Partner } from '@/types/partners';

export type PartnerMissingField = {
  key: string;
  label: string;
};

const blank = (v?: string | null) => !v || !String(v).trim();
const blankList = (v?: string[] | null) => !v || v.length === 0;

/** Field inventory used by Partner Tracker missing-info / data-gap views. */
export const PARTNER_GAP_FIELDS: Array<{
  key: string;
  label: string;
  test: (p: Partner) => boolean;
}> = [
  {
    key: 'contact_person',
    label: 'Primary contact',
    test: (p) => blank(p.contactPerson),
  },
  { key: 'email', label: 'Primary email', test: (p) => blank(p.email) },
  { key: 'phone', label: 'Phone', test: (p) => blank(p.phone) },
  {
    key: 'agreement_type',
    label: 'Agreement type',
    test: (p) => blank(p.agreementType),
  },
  {
    key: 'product_categories',
    label: 'Product categories',
    test: (p) => blankList(p.productCategories),
  },
  {
    key: 'verticals',
    label: 'Verticals',
    test: (p) => blankList(p.verticals),
  },
  {
    key: 'valid_thru',
    label: 'Valid Thru',
    test: (p) => blank(p.validThru),
  },
  {
    key: 'scm_vendor',
    label: 'SCM link',
    test: (p) => !p.scmVendorId && !p.isScmLinked,
  },
];

export function getPartnerMissingFields(partner: Partner): PartnerMissingField[] {
  return PARTNER_GAP_FIELDS.filter((f) => f.test(partner)).map(({ key, label }) => ({
    key,
    label,
  }));
}
