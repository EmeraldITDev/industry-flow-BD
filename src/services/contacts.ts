import api from './api';

export type ContactType = 'client' | 'partner';

export interface ContactSummary {
  id: string;
  fullName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
  organizationType?: ContactType | null;
  organizationName?: string | null;
  types: ContactType[];
  organizations: string[];
  projectsCount: number;
  partnersCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ContactDetail extends ContactSummary {
  projects: Array<{
    id: string | number;
    name: string;
    clientName?: string | null;
    status?: string | null;
    contactRole?: string | null;
    isPrimary: boolean;
  }>;
  partners: Array<{
    id: string | number;
    companyName: string;
    relationshipStage?: string | null;
    isPrimary: boolean;
  }>;
}

export interface ContactInput {
  fullName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  organizationType?: ContactType | null;
  organizationName?: string | null;
}

export interface ContactFilters {
  search?: string;
  type?: ContactType;
  organization?: string;
  isActive?: boolean;
  potentialDuplicates?: boolean;
  page?: number;
  perPage?: number;
}

export interface ContactPage {
  data: ContactSummary[];
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface DuplicateGroup {
  type: 'email' | 'phone';
  value: string;
  count: number;
  contacts: ContactSummary[];
}

const payload = (input: ContactInput) => ({
  full_name: input.fullName,
  job_title: input.jobTitle,
  department: input.department,
  email: input.email,
  phone: input.phone,
  notes: input.notes,
  is_active: input.isActive,
  organization_type: input.organizationType,
  organization_name: input.organizationName,
});

export const contactsService = {
  list: async (filters: ContactFilters = {}): Promise<ContactPage> => {
    const response = await api.get('/api/contacts', {
      params: {
        search: filters.search || undefined,
        type: filters.type,
        organization: filters.organization || undefined,
        is_active: filters.isActive,
        potential_duplicates: filters.potentialDuplicates || undefined,
        page: filters.page ?? 1,
        per_page: filters.perPage ?? 25,
      },
    });
    const data = response.data;
    return {
      data: data.data ?? [],
      currentPage: Number(data.current_page ?? 1),
      lastPage: Number(data.last_page ?? 1),
      perPage: Number(data.per_page ?? 25),
      total: Number(data.total ?? 0),
    };
  },

  get: async (id: string): Promise<ContactDetail> => {
    const response = await api.get(`/api/contacts/${id}`);
    return response.data.data;
  },

  create: async (input: ContactInput): Promise<ContactSummary> => {
    const response = await api.post('/api/contacts', payload(input));
    return response.data.data;
  },

  update: async (id: string, input: ContactInput): Promise<ContactSummary> => {
    const response = await api.put(`/api/contacts/${id}`, payload(input));
    return response.data.data;
  },

  findDuplicates: async (email?: string, phone?: string, id?: string): Promise<ContactSummary[]> => {
    const url = id ? `/api/contacts/${id}/duplicates` : '/api/contacts/duplicates';
    const response = await api.get(url, { params: { email: email || undefined, phone: phone || undefined } });
    return response.data.data ?? [];
  },

  duplicateGroups: async (): Promise<DuplicateGroup[]> => {
    const response = await api.get('/api/contacts/potential-duplicates');
    return response.data.data ?? [];
  },

  organizations: async (): Promise<Array<{ type: ContactType; name: string }>> => {
    const response = await api.get('/api/contacts/organizations');
    return response.data.data ?? [];
  },
};
