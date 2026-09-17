export const RELATIONSHIP_STAGES = [
  'Prospecting',
  'First Contact Made',
  'NDA Signed',
  'Active Engagement',
  'Strategic Partner',
  'Dormant',
  'Disqualified',
] as const;

export type RelationshipStage = (typeof RELATIONSHIP_STAGES)[number];

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
  relationshipOwnerIds: string[];
  relationshipOwners?: PartnerOwner[];
  relationshipStage: RelationshipStage | string;
  verticals: string[];
  productCategories: string[];
  lastContactDate?: string | null;
  nextAction?: string;
  notes?: string;
  scmVendorId?: string | null;
  isScmLinked?: boolean;
  /** Present when linked; null means the SCM lookup failed. */
  scmData?: ScmVendorData | null;
  createdAt?: string;
  updatedAt?: string;
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
  relationshipOwnerIds?: string[];
  relationshipStage?: RelationshipStage | string;
  verticals?: string[];
  productCategories?: string[];
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
