export const RELATIONSHIP_STAGES = [
  'Identified',
  'Prospecting',
  'Discovery Discussions',
  'NDA Signed',
  'Detailed Discussions',
  'Agreement Drafted | Negotiation',
  'Due Diligence | Compliance Review | Approval',
  'Onboarding',
  'Active Partner',
  'Dormant',
  'Disqualified',
  'Terminated | Offboarded',
  'Blacklisted | Delisted',
] as const;

export type RelationshipStage = (typeof RELATIONSHIP_STAGES)[number];

export const PARTNER_TYPES = ['OEM', 'OCM', 'ISP', 'Aggregator'] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const AGREEMENT_TYPES = [
  'Transactional',
  'CPA',
  'MOU',
  'NCNDA',
  'MSA',
] as const;
export type AgreementType = (typeof AGREEMENT_TYPES)[number];

export const STRATEGIC_VALUES = [
  'High',
  'Medium',
  'Low',
  'Uncertain',
] as const;
export type StrategicValue = (typeof STRATEGIC_VALUES)[number];

/** Extensible list — seed with Active; add more statuses over time. */
export const ENGAGEMENT_STATUSES = ['Active'] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];

export interface PartnerOwner {
  id: string;
  name: string;
  email?: string;
}

export interface ScmVendorData {
  vendorId?: string;
  vendorName?: string;
  kycStatus?: string;
  activeStatus?: string | boolean;
  category?: string;
}

export interface Partner {
  id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  type: string[];
  agreementType?: string | null;
  /** Optional partnership agreement expiry (Valid Thru). */
  validThru?: string | null;
  specialization?: string;
  website?: string;
  location?: string;
  strategicValue?: string | null;
  engagementStatus?: string | null;
  /** False when contact person or email is missing (e.g. migrated name-only partners). */
  isProfileComplete?: boolean;
  relationshipOwnerIds: string[];
  relationshipOwners?: PartnerOwner[];
  relationshipStage: RelationshipStage | string;
  verticals: string[];
  productCategories: string[];
  subProductCategories: string[];
  lastContactDate?: string | null;
  nextAction?: string;
  notes?: string;
  scmVendorId?: string | null;
  isScmLinked?: boolean;
  linkedOpportunitiesCount?: number;
  totalValueNgn?: number;
  totalValueUsd?: number;
  /** Present when linked; null means the SCM lookup failed. */
  scmData?: ScmVendorData | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Prefer API flag; fall back to local contact/email presence. */
export function isPartnerProfileComplete(partner: Pick<Partner, 'isProfileComplete' | 'contactPerson' | 'email'>): boolean {
  if (typeof partner.isProfileComplete === 'boolean') {
    return partner.isProfileComplete;
  }
  return Boolean(partner.contactPerson?.trim() && partner.email?.trim());
}

export interface ScmVendorSearchResult {
  vendorId: string;
  vendorName: string;
  kycStatus?: string;
}

export interface CreatePartnerData {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  type?: string[];
  agreementType?: string | null;
  validThru?: string | null;
  specialization?: string;
  website?: string;
  location?: string;
  strategicValue?: string | null;
  engagementStatus?: string | null;
  relationshipOwnerIds?: string[];
  relationshipStage?: RelationshipStage | string;
  verticals?: string[];
  productCategories?: string[];
  subProductCategories?: string[];
  lastContactDate?: string | null;
  nextAction?: string;
  notes?: string;
  scmVendorId?: string | null;
}

export type UpdatePartnerData = Partial<CreatePartnerData>;

export interface PartnerFilters {
  search?: string;
  vertical?: string;
  product?: string;
  relationshipStage?: string;
  relationshipOwnerId?: string;
}
