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

export type PartnerTrackerRankRow = {
  id: number | string;
  companyName: string;
  relationshipStage?: string | null;
  linkedOpportunitiesCount: number;
  totalValueUsd: number;
  totalValueNgn: number;
};

export type PartnerTrackerMetrics = {
  definition: string;
  definitionLabel: string;
  byOpportunityCount: PartnerTrackerRankRow[];
  byVolume: PartnerTrackerRankRow[];
  activeWithZeroOpportunities: {
    count: number;
    partners: Array<{ id: number | string; companyName: string; relationshipStage?: string | null }>;
  };
  incompleteProfiles: {
    count: number;
    partners: Array<{
      id: number | string;
      companyName: string;
      contactPerson?: string | null;
      email?: string | null;
      relationshipStage?: string | null;
    }>;
  };
  concentration: {
    totalVolumeUsd: number;
    totalVolumeNgn: number;
    top1Pct: number;
    top3Pct: number;
    topPartners: PartnerTrackerRankRow[];
  };
  validThruExpiring90Days: {
    count: number;
    partners: Array<{
      id: number | string;
      companyName: string;
      validThru?: string | null;
      relationshipStage?: string | null;
    }>;
  };
  totals: {
    partners: number;
    partnersWithLinks: number;
    linkedOpportunities: number;
  };
};

const normalizeRankRow = (raw: any): PartnerTrackerRankRow => ({
  id: raw.id,
  companyName: String(raw.companyName ?? raw.company_name ?? ''),
  relationshipStage: raw.relationshipStage ?? raw.relationship_stage ?? null,
  linkedOpportunitiesCount: Number(
    raw.linkedOpportunitiesCount ?? raw.linked_opportunities_count ?? 0
  ),
  totalValueUsd: Number(raw.totalValueUsd ?? raw.total_value_usd ?? 0),
  totalValueNgn: Number(raw.totalValueNgn ?? raw.total_value_ngn ?? 0),
});

const normalizeTrackerMetrics = (raw: any): PartnerTrackerMetrics => ({
  definition: String(raw.definition ?? 'partner_opportunity_pivot'),
  definitionLabel: String(
    raw.definitionLabel ??
      raw.definition_label ??
      'Linked via Partner Tracker (partner_opportunity pivot)'
  ),
  byOpportunityCount: (raw.byOpportunityCount ?? raw.by_opportunity_count ?? []).map(
    normalizeRankRow
  ),
  byVolume: (raw.byVolume ?? raw.by_volume ?? []).map(normalizeRankRow),
  activeWithZeroOpportunities: {
    count: Number(
      raw.activeWithZeroOpportunities?.count ??
        raw.active_with_zero_opportunities?.count ??
        0
    ),
    partners: (
      raw.activeWithZeroOpportunities?.partners ??
      raw.active_with_zero_opportunities?.partners ??
      []
    ).map((p: any) => ({
      id: p.id,
      companyName: String(p.companyName ?? p.company_name ?? ''),
      relationshipStage: p.relationshipStage ?? p.relationship_stage ?? null,
    })),
  },
  incompleteProfiles: {
    count: Number(raw.incompleteProfiles?.count ?? raw.incomplete_profiles?.count ?? 0),
    partners: (raw.incompleteProfiles?.partners ?? raw.incomplete_profiles?.partners ?? []).map(
      (p: any) => ({
        id: p.id,
        companyName: String(p.companyName ?? p.company_name ?? ''),
        contactPerson: p.contactPerson ?? p.contact_person ?? null,
        email: p.email ?? null,
        relationshipStage: p.relationshipStage ?? p.relationship_stage ?? null,
      })
    ),
  },
  concentration: {
    totalVolumeUsd: Number(
      raw.concentration?.totalVolumeUsd ?? raw.concentration?.total_volume_usd ?? 0
    ),
    totalVolumeNgn: Number(
      raw.concentration?.totalVolumeNgn ?? raw.concentration?.total_volume_ngn ?? 0
    ),
    top1Pct: Number(raw.concentration?.top1Pct ?? raw.concentration?.top1_pct ?? 0),
    top3Pct: Number(raw.concentration?.top3Pct ?? raw.concentration?.top3_pct ?? 0),
    topPartners: (
      raw.concentration?.topPartners ??
      raw.concentration?.top_partners ??
      []
    ).map(normalizeRankRow),
  },
  validThruExpiring90Days: {
    count: Number(
      raw.validThruExpiring90Days?.count ?? raw.valid_thru_expiring_90_days?.count ?? 0
    ),
    partners: (
      raw.validThruExpiring90Days?.partners ??
      raw.valid_thru_expiring_90_days?.partners ??
      []
    ).map((p: any) => ({
      id: p.id,
      companyName: String(p.companyName ?? p.company_name ?? ''),
      validThru: p.validThru ?? p.valid_thru ?? null,
      relationshipStage: p.relationshipStage ?? p.relationship_stage ?? null,
    })),
  },
  totals: {
    partners: Number(raw.totals?.partners ?? 0),
    partnersWithLinks: Number(
      raw.totals?.partnersWithLinks ?? raw.totals?.partners_with_links ?? 0
    ),
    linkedOpportunities: Number(
      raw.totals?.linkedOpportunities ?? raw.totals?.linked_opportunities ?? 0
    ),
  },
});

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
    validThru: raw.validThru ?? raw.valid_thru ?? null,
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
    validThru: 'valid_thru',
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

  /**
   * Shared Partner Tracker aggregates (partner_opportunity pivot).
   * Dashboard + Chairman cards must use this so counts match drill-downs.
   */
  getTrackerMetrics: async (): Promise<PartnerTrackerMetrics> => {
    const response = await api.get('/api/partners/tracker-metrics');
    const raw = response.data?.data ?? response.data ?? {};
    return normalizeTrackerMetrics(raw);
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

  /** Replace linked partners for a project (empty array clears all links). */
  syncForProject: async (
    projectId: string,
    partnerIds: string[]
  ): Promise<Partner[]> => {
    const response = await api.post(`/api/projects/${projectId}/partners`, {
      partner_ids: partnerIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0),
      partnerIds: partnerIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0),
    });
    return normalizeArray(response.data).map(normalizePartner);
  },
};
