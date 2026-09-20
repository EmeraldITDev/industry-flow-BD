import api from './api';
import type {
  CreatePartnerData,
  Partner,
  PartnerFilters,
  PartnerOwner,
  ScmVendorData,
  ScmVendorSearchResult,
  UpdatePartnerData,
} from '@/types/partners';

const normalizeArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
};

const toOwner = (raw: any): PartnerOwner => ({
  id: String(raw.id ?? raw.user_id ?? ''),
  name: String(raw.name ?? raw.full_name ?? 'Unknown'),
  email: raw.email ? String(raw.email) : undefined,
});

const toScmData = (raw: any): ScmVendorData | null => {
  if (raw == null) return null;
  const vendorIdRaw = raw.vendorId ?? raw.vendor_id ?? raw.id;
  return {
    vendorId: vendorIdRaw != null ? String(vendorIdRaw) : undefined,
    vendorName: raw.vendorName ?? raw.vendor_name ?? raw.name,
    kycStatus: raw.kycStatus ?? raw.kyc_status,
    activeStatus: raw.activeStatus ?? raw.active_status ?? raw.is_active ?? raw.active,
    category: raw.category ?? raw.vendor_category,
  };
};

export const normalizePartner = (raw: any): Partner => {
  const ownersRaw = raw.relationshipOwners ?? raw.relationship_owners ?? [];
  const ownerIdsFromOwners = Array.isArray(ownersRaw)
    ? ownersRaw.map((o: any) => String(o.id ?? o.user_id ?? o)).filter(Boolean)
    : [];
  const relationshipOwnerIds = (
    raw.relationshipOwnerIds ??
    raw.relationship_owner_ids ??
    ownerIdsFromOwners
  ).map((id: any) => String(id));

  const scmVendorId =
    raw.scmVendorId ?? raw.scm_vendor_id ?? null;

  // scm_data: undefined = not loaded / not linked; null = linked but SCM call failed
  let scmData: ScmVendorData | null | undefined = undefined;
  if ('scmData' in raw || 'scm_data' in raw) {
    scmData = toScmData(raw.scmData ?? raw.scm_data);
  }

  return {
    id: String(raw.id),
    companyName: String(raw.companyName ?? raw.company_name ?? ''),
    contactPerson: raw.contactPerson ?? raw.contact_person ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    type: Array.isArray(raw.type)
      ? raw.type.map(String)
      : typeof raw.type === 'string' && raw.type.trim()
        ? raw.type.split(/[;,|]/).map((s: string) => s.trim()).filter(Boolean)
        : [],
    agreementType: raw.agreementType ?? raw.agreement_type ?? null,
    specialization: raw.specialization ?? '',
    website: raw.website ?? '',
    location: raw.location ?? '',
    strategicValue: raw.strategicValue ?? raw.strategic_value ?? null,
    engagementStatus: raw.engagementStatus ?? raw.engagement_status ?? null,
    isProfileComplete: (() => {
      if (typeof raw.isProfileComplete === 'boolean') return raw.isProfileComplete;
      if (typeof raw.is_profile_complete === 'boolean') return raw.is_profile_complete;
      const contact = String(raw.contactPerson ?? raw.contact_person ?? '').trim();
      const email = String(raw.email ?? '').trim();
      return Boolean(contact && email);
    })(),
    relationshipOwnerIds,
    relationshipOwners: Array.isArray(ownersRaw) ? ownersRaw.map(toOwner) : undefined,
    relationshipStage: raw.relationshipStage ?? raw.relationship_stage ?? 'Identified',
    verticals: Array.isArray(raw.verticals)
      ? raw.verticals.map(String)
      : [],
    productCategories: Array.isArray(raw.productCategories ?? raw.product_categories)
      ? (raw.productCategories ?? raw.product_categories).map(String)
      : [],
    subProductCategories: Array.isArray(raw.subProductCategories ?? raw.sub_product_categories)
      ? (raw.subProductCategories ?? raw.sub_product_categories).map(String)
      : [],
    lastContactDate: raw.lastContactDate ?? raw.last_contact_date ?? null,
    nextAction: raw.nextAction ?? raw.next_action ?? '',
    notes: raw.notes ?? '',
    scmVendorId: scmVendorId != null && scmVendorId !== '' ? String(scmVendorId) : null,
    isScmLinked: Boolean(
      raw.isScmLinked ?? raw.is_scm_linked ?? (scmVendorId != null && scmVendorId !== '')
    ),
    linkedOpportunitiesCount: Number(
      raw.linkedOpportunitiesCount ?? raw.linked_opportunities_count ?? 0
    ),
    totalValueNgn: Number(raw.totalValueNgn ?? raw.total_value_ngn ?? 0),
    totalValueUsd: Number(raw.totalValueUsd ?? raw.total_value_usd ?? 0),
    scmData,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
};

const toPayload = (data: CreatePartnerData | UpdatePartnerData): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  const map: Record<string, string> = {
    companyName: 'company_name',
    contactPerson: 'contact_person',
    email: 'email',
    phone: 'phone',
    type: 'type',
    agreementType: 'agreement_type',
    specialization: 'specialization',
    website: 'website',
    location: 'location',
    strategicValue: 'strategic_value',
    engagementStatus: 'engagement_status',
    relationshipOwnerIds: 'relationship_owner_ids',
    relationshipStage: 'relationship_stage',
    verticals: 'verticals',
    productCategories: 'product_categories',
    subProductCategories: 'sub_product_categories',
    lastContactDate: 'last_contact_date',
    nextAction: 'next_action',
    notes: 'notes',
    scmVendorId: 'scm_vendor_id',
  };

  Object.entries(map).forEach(([camel, snake]) => {
    if (camel in data) {
      let value = (data as Record<string, unknown>)[camel];
      if (camel === 'relationshipOwnerIds' && Array.isArray(value)) {
        value = value.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
      }
      payload[camel] = value;
      payload[snake] = value;
    }
  });

  return payload;
};

export const partnersService = {
  /** Full list (escape hatch). Prefer `list` for the Partner Tracker page. */
  getAll: async (filters?: PartnerFilters): Promise<Partner[]> => {
    const params: Record<string, string | number | boolean> = { all: 1 };
    if (filters?.search) params.search = filters.search;
    if (filters?.vertical) params.vertical = filters.vertical;
    if (filters?.product) {
      params.product = filters.product;
      params.product_category = filters.product;
    }
    if (filters?.relationshipStage) {
      params.relationship_stage = filters.relationshipStage;
      params.stage = filters.relationshipStage;
    }
    if (filters?.relationshipOwnerId) {
      params.relationship_owner_id = filters.relationshipOwnerId;
      params.relationshipOwnerId = filters.relationshipOwnerId;
    }

    const response = await api.get('/api/partners', { params });
    return normalizeArray(response.data).map(normalizePartner);
  },

  /** Server-paginated list for Partner Tracker. */
  list: async (
    filters?: PartnerFilters & { page?: number; per_page?: number }
  ): Promise<{ partners: Partner[]; total: number; page: number; lastPage: number }> => {
    const params: Record<string, string | number> = {
      page: filters?.page ?? 1,
      per_page: filters?.per_page ?? 50,
    };
    if (filters?.search) params.search = filters.search;
    if (filters?.vertical) params.vertical = filters.vertical;
    if (filters?.product) {
      params.product = filters.product;
      params.product_category = filters.product;
    }
    if (filters?.relationshipStage) {
      params.relationship_stage = filters.relationshipStage;
      params.stage = filters.relationshipStage;
    }
    if (filters?.relationshipOwnerId) {
      params.relationship_owner_id = filters.relationshipOwnerId;
      params.relationshipOwnerId = filters.relationshipOwnerId;
    }

    const response = await api.get('/api/partners', { params });
    const body = response.data ?? {};
    const partners = normalizeArray(body).map(normalizePartner);
    const meta = body.meta ?? {};
    return {
      partners,
      total: Number(meta.total ?? partners.length),
      page: Number(meta.current_page ?? params.page),
      lastPage: Number(meta.last_page ?? 1),
    };
  },

  getById: async (id: string): Promise<Partner> => {
    const response = await api.get(`/api/partners/${id}`);
    const raw = response.data?.data ?? response.data;
    return normalizePartner(raw);
  },

  create: async (data: CreatePartnerData): Promise<Partner> => {
    const response = await api.post('/api/partners', toPayload(data));
    const raw = response.data?.data ?? response.data;
    return normalizePartner(raw);
  },

  update: async (id: string, data: UpdatePartnerData): Promise<Partner> => {
    const response = await api.put(`/api/partners/${id}`, toPayload(data));
    const raw = response.data?.data ?? response.data;
    return normalizePartner(raw);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/partners/${id}`);
  },

  searchScmVendors: async (q: string = ''): Promise<ScmVendorSearchResult[]> => {
    const response = await api.get('/api/partners/scm-search', {
      // Always send q (including '') so the default list endpoint is hit.
      params: { q: q ?? '' },
    });
    return normalizeArray(response.data).map((raw: any) => ({
      vendorId: String(raw.vendorId ?? raw.vendor_id ?? raw.id ?? ''),
      vendorName: String(raw.vendorName ?? raw.vendor_name ?? raw.name ?? ''),
      kycStatus: raw.kycStatus ?? raw.kyc_status,
    }));
  },

  getForProject: async (projectId: string): Promise<Partner[]> => {
    const response = await api.get(`/api/projects/${projectId}/partners`);
    return normalizeArray(response.data).map(normalizePartner);
  },

  /** Sync linked partners for a project (authoritative partner_ids write). */
  syncForProject: async (
    projectId: string,
    partnerIds: string[]
  ): Promise<Partner[]> => {
    const response = await api.post(`/api/projects/${projectId}/partners`, {
      partner_ids: partnerIds,
      partnerIds,
    });
    return normalizeArray(response.data).map(normalizePartner);
  },
};
