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
import { isPartnerProfileComplete } from '@/types/partners';

export type PartnerTrackerRankRow = {
  id: number | string;
  companyName: string;
  relationshipStage?: string | null;
  linkedOpportunitiesCount: number;
  totalValueUsd: number;
  totalValueNgn: number;
};

export type PartnerTrackerOwnerBreakdown = {
  ownerId: number | string | null;
  ownerName: string;
  count: number;
  pct: number;
};

export type PartnerTrackerDataGapField = {
  key: string;
  label: string;
  count: number;
  pct: number;
};

export type PartnerTrackerMetrics = {
  definition: string;
  definitionLabel: string;
  byOpportunityCount: PartnerTrackerRankRow[];
  byVolume: PartnerTrackerRankRow[];
  activeWithZeroOpportunities: {
    count: number;
    definition?: string;
    byOwner: PartnerTrackerOwnerBreakdown[];
    partners: Array<{
      id: number | string;
      companyName: string;
      relationshipStage?: string | null;
      owners?: Array<{ id: number | string; name: string }>;
      ownerNames?: string[];
    }>;
  };
  incompleteProfiles: {
    count: number;
    definition?: string;
    partners: Array<{
      id: number | string;
      companyName: string;
      contactPerson?: string | null;
      email?: string | null;
      relationshipStage?: string | null;
      missingFields?: string[];
      owners?: Array<{ id: number | string; name: string }>;
    }>;
  };
  /** Separate from incompleteProfiles — field inventory across all partners. */
  dataGaps: {
    partnersScanned: number;
    definition?: string;
    fields: PartnerTrackerDataGapField[];
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
    definition:
      raw.activeWithZeroOpportunities?.definition ??
      raw.active_with_zero_opportunities?.definition ??
      undefined,
    byOwner: (
      raw.activeWithZeroOpportunities?.byOwner ??
      raw.active_with_zero_opportunities?.by_owner ??
      []
    ).map((row: any) => ({
      ownerId: row.ownerId ?? row.owner_id ?? null,
      ownerName: String(row.ownerName ?? row.owner_name ?? 'Unassigned'),
      count: Number(row.count ?? 0),
      pct: Number(row.pct ?? 0),
    })),
    partners: (
      raw.activeWithZeroOpportunities?.partners ??
      raw.active_with_zero_opportunities?.partners ??
      []
    ).map((p: any) => ({
      id: p.id,
      companyName: String(p.companyName ?? p.company_name ?? ''),
      relationshipStage: p.relationshipStage ?? p.relationship_stage ?? null,
      owners: (p.owners ?? []).map((o: any) => ({
        id: o.id,
        name: String(o.name ?? ''),
      })),
      ownerNames: (p.ownerNames ?? p.owner_names ?? []).map(String),
    })),
  },
  incompleteProfiles: {
    count: Number(raw.incompleteProfiles?.count ?? raw.incomplete_profiles?.count ?? 0),
    definition:
      raw.incompleteProfiles?.definition ?? raw.incomplete_profiles?.definition ?? undefined,
    partners: (raw.incompleteProfiles?.partners ?? raw.incomplete_profiles?.partners ?? []).map(
      (p: any) => ({
        id: p.id,
        companyName: String(p.companyName ?? p.company_name ?? ''),
        contactPerson: p.contactPerson ?? p.contact_person ?? null,
        email: p.email ?? null,
        relationshipStage: p.relationshipStage ?? p.relationship_stage ?? null,
        missingFields: (p.missingFields ?? p.missing_fields ?? []).map(String),
        owners: (p.owners ?? []).map((o: any) => ({
          id: o.id,
          name: String(o.name ?? ''),
        })),
      })
    ),
  },
  dataGaps: {
    partnersScanned: Number(
      raw.dataGaps?.partnersScanned ??
        raw.data_gaps?.partners_scanned ??
        raw.totals?.partners ??
        0
    ),
    definition: raw.dataGaps?.definition ?? raw.data_gaps?.definition ?? undefined,
    fields: (raw.dataGaps?.fields ?? raw.data_gaps?.fields ?? []).map((f: any) => ({
      key: String(f.key ?? ''),
      label: String(f.label ?? f.key ?? ''),
      count: Number(f.count ?? 0),
      pct: Number(f.pct ?? 0),
    })),
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

/** Enrich metrics from full partner list when backend payload is older / incomplete. */
function enrichTrackerMetricsFromPartners(
  metrics: PartnerTrackerMetrics,
  partners: Partner[]
): PartnerTrackerMetrics {
  const needsOwner =
    !metrics.activeWithZeroOpportunities.byOwner?.length &&
    metrics.activeWithZeroOpportunities.count >= 0;
  const needsGaps = !metrics.dataGaps?.fields?.length;
  const needsIncompleteList =
    metrics.incompleteProfiles.count > 0 &&
    metrics.incompleteProfiles.partners.length === 0;

  if (!needsOwner && !needsGaps && !needsIncompleteList && metrics.activeWithZeroOpportunities.partners.length > 0) {
    return metrics;
  }

  const activeZero = partners.filter(
    (p) =>
      p.relationshipStage === 'Active Partner' &&
      Number(p.linkedOpportunitiesCount ?? 0) === 0
  );

  const incomplete = partners.filter((p) => !isPartnerProfileComplete(p));

  const byOwnerMap = new Map<
    string,
    { ownerId: number | string | null; ownerName: string; count: number }
  >();
  for (const p of activeZero) {
    const owners = p.relationshipOwners ?? [];
    if (owners.length === 0) {
      const cur = byOwnerMap.get('unassigned') ?? {
        ownerId: null,
        ownerName: 'Unassigned',
        count: 0,
      };
      cur.count += 1;
      byOwnerMap.set('unassigned', cur);
    } else {
      for (const o of owners) {
        const key = String(o.id);
        const cur = byOwnerMap.get(key) ?? {
          ownerId: o.id,
          ownerName: o.name,
          count: 0,
        };
        cur.count += 1;
        byOwnerMap.set(key, cur);
      }
    }
  }
  const totalActiveZero = activeZero.length;
  const byOwner = [...byOwnerMap.values()]
    .sort((a, b) => b.count - a.count || a.ownerName.localeCompare(b.ownerName))
    .map((row) => ({
      ...row,
      pct: totalActiveZero > 0 ? Math.round((row.count / totalActiveZero) * 1000) / 10 : 0,
    }));

  const blank = (v?: string | null) => !v || !String(v).trim();
  const blankList = (v?: string[] | null) => !v || v.length === 0;
  const scanned = partners.length;
  const gapDefs: Array<{ key: string; label: string; test: (p: Partner) => boolean }> = [
    { key: 'contact_person', label: 'Missing contact person', test: (p) => blank(p.contactPerson) },
    { key: 'email', label: 'Missing email', test: (p) => blank(p.email) },
    { key: 'agreement_type', label: 'Missing agreement type', test: (p) => blank(p.agreementType) },
    {
      key: 'product_categories',
      label: 'Missing product categories',
      test: (p) => blankList(p.productCategories),
    },
    { key: 'verticals', label: 'Missing verticals', test: (p) => blankList(p.verticals) },
    { key: 'phone', label: 'Missing phone', test: (p) => blank(p.phone) },
    { key: 'valid_thru', label: 'Missing Valid Thru', test: (p) => blank(p.validThru) },
  ];
  const fields = gapDefs
    .map((d) => {
      const count = partners.filter(d.test).length;
      return {
        key: d.key,
        label: d.label,
        count,
        pct: scanned > 0 ? Math.round((count / scanned) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    ...metrics,
    activeWithZeroOpportunities: {
      count: totalActiveZero,
      definition:
        metrics.activeWithZeroOpportunities.definition ??
        'Active Partner stage with zero partner_opportunity links',
      byOwner: needsOwner || !metrics.activeWithZeroOpportunities.byOwner.length ? byOwner : metrics.activeWithZeroOpportunities.byOwner,
      partners:
        metrics.activeWithZeroOpportunities.partners.length > 0
          ? metrics.activeWithZeroOpportunities.partners
          : activeZero.map((p) => ({
              id: p.id,
              companyName: p.companyName,
              relationshipStage: p.relationshipStage,
              owners: (p.relationshipOwners ?? []).map((o) => ({ id: o.id, name: o.name })),
              ownerNames: (p.relationshipOwners ?? []).map((o) => o.name),
            })),
    },
    incompleteProfiles: {
      count: incomplete.length,
      definition:
        metrics.incompleteProfiles.definition ??
        'Missing contact person and/or email (matches Partner Tracker Incomplete badge)',
      partners:
        metrics.incompleteProfiles.partners.length > 0
          ? metrics.incompleteProfiles.partners
          : incomplete.map((p) => ({
              id: p.id,
              companyName: p.companyName,
              contactPerson: p.contactPerson,
              email: p.email,
              relationshipStage: p.relationshipStage,
              missingFields: [
                ...(blank(p.contactPerson) ? ['contact_person'] : []),
                ...(blank(p.email) ? ['email'] : []),
              ],
              owners: (p.relationshipOwners ?? []).map((o) => ({ id: o.id, name: o.name })),
            })),
    },
    dataGaps:
      needsGaps || !metrics.dataGaps.fields.length
        ? {
            partnersScanned: scanned,
            definition:
              'Field inventory across all partners (separate from Tracker incomplete badge)',
            fields,
          }
        : metrics.dataGaps,
    totals: {
      ...metrics.totals,
      partners: metrics.totals.partners || scanned,
    },
  };
}

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
    if (filters?.incomplete) {
      params.incomplete = 1;
    }
    if (filters?.zeroLinks) {
      params.zero_links = 1;
      params.zeroLinks = 1;
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
    if (filters?.incomplete) {
      params.incomplete = 1;
    }
    if (filters?.zeroLinks) {
      params.zero_links = 1;
      params.zeroLinks = 1;
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
   * Falls back to enriching from /api/partners?all=1 when the metrics
   * payload lacks owner breakdown / data-gap inventory (pre-deploy).
   */
  getTrackerMetrics: async (): Promise<PartnerTrackerMetrics> => {
    let metrics: PartnerTrackerMetrics;
    try {
      const response = await api.get('/api/partners/tracker-metrics');
      const raw = response.data?.data ?? response.data ?? {};
      metrics = normalizeTrackerMetrics(raw);
    } catch {
      metrics = normalizeTrackerMetrics({});
    }

    const needsEnrichment =
      !metrics.activeWithZeroOpportunities.byOwner?.length ||
      !metrics.dataGaps?.fields?.length ||
      (metrics.incompleteProfiles.count > 0 &&
        metrics.incompleteProfiles.partners.length === 0) ||
      (metrics.activeWithZeroOpportunities.count > 0 &&
        metrics.activeWithZeroOpportunities.partners.length === 0);

    if (!needsEnrichment) return metrics;

    try {
      const response = await api.get('/api/partners', { params: { all: 1 } });
      const partners = normalizeArray(response.data).map(normalizePartner);
      return enrichTrackerMetricsFromPartners(metrics, partners);
    } catch {
      return metrics;
    }
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
