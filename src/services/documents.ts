import api from './api';

export interface RepositoryDocument {
  id: string;
  title: string;
  documentType: string;
  vertical: string;
  client: string | null;
  description: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  source: string;
  uploadedBy: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  uploader?: { id: string; name: string; email?: string } | null;
}

export interface OpportunityDocument {
  id: string;
  projectId: string;
  title: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  source: string;
  uploadedBy: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  uploader?: { id: string; name: string; email?: string } | null;
}

export type RepositoryFilters = {
  vertical?: string;
  documentType?: string;
  client?: string;
  search?: string;
};

export type UploadProgressHandler = (percent: number) => void;

function normalizeRepoDoc(raw: any): RepositoryDocument {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    documentType: raw.documentType ?? raw.document_type ?? '',
    vertical: raw.vertical ?? '',
    client: raw.client ?? null,
    description: raw.description ?? null,
    fileName: raw.fileName ?? raw.file_name ?? '',
    fileSize: Number(raw.fileSize ?? raw.file_size ?? 0),
    mimeType: raw.mimeType ?? raw.mime_type ?? '',
    source: raw.source ?? 's3',
    uploadedBy:
      raw.uploadedBy != null
        ? String(raw.uploadedBy)
        : raw.uploaded_by != null
          ? String(raw.uploaded_by)
          : null,
    url: raw.url ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    updatedAt: raw.updatedAt ?? raw.updated_at ?? '',
    uploader: raw.uploader
      ? {
          id: String(raw.uploader.id),
          name: raw.uploader.name ?? '',
          email: raw.uploader.email,
        }
      : null,
  };
}

function normalizeOppDoc(raw: any): OpportunityDocument {
  return {
    id: String(raw.id),
    projectId: String(raw.projectId ?? raw.project_id ?? ''),
    title: raw.title ?? '',
    documentType: raw.documentType ?? raw.document_type ?? '',
    fileName: raw.fileName ?? raw.file_name ?? '',
    fileSize: Number(raw.fileSize ?? raw.file_size ?? 0),
    mimeType: raw.mimeType ?? raw.mime_type ?? '',
    source: raw.source ?? 's3',
    uploadedBy:
      raw.uploadedBy != null
        ? String(raw.uploadedBy)
        : raw.uploaded_by != null
          ? String(raw.uploaded_by)
          : null,
    url: raw.url ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    updatedAt: raw.updatedAt ?? raw.updated_at ?? '',
    uploader: raw.uploader
      ? {
          id: String(raw.uploader.id),
          name: raw.uploader.name ?? '',
          email: raw.uploader.email,
        }
      : null,
  };
}

function unwrapList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function unwrapOne(data: any): any {
  return data?.data ?? data;
}

export const repositoryDocumentsService = {
  getAll: async (filters: RepositoryFilters = {}): Promise<RepositoryDocument[]> => {
    const params: Record<string, string | number> = { all: 1 };
    if (filters.vertical) params.vertical = filters.vertical;
    if (filters.documentType) params.document_type = filters.documentType;
    if (filters.client) params.client = filters.client;
    if (filters.search) params.search = filters.search;

    const response = await api.get('/api/repository-documents', { params });
    return unwrapList(response.data).map(normalizeRepoDoc);
  },

  list: async (
    filters: RepositoryFilters & { page?: number; per_page?: number } = {}
  ): Promise<{
    documents: RepositoryDocument[];
    total: number;
    page: number;
    lastPage: number;
  }> => {
    const params: Record<string, string | number> = {
      page: filters.page ?? 1,
      per_page: filters.per_page ?? 50,
    };
    if (filters.vertical) params.vertical = filters.vertical;
    if (filters.documentType) params.document_type = filters.documentType;
    if (filters.client) params.client = filters.client;
    if (filters.search) params.search = filters.search;

    const response = await api.get('/api/repository-documents', { params });
    const body = response.data ?? {};
    const documents = unwrapList(body).map(normalizeRepoDoc);
    const meta = body.meta ?? {};
    return {
      documents,
      total: Number(meta.total ?? documents.length),
      page: Number(meta.current_page ?? params.page),
      lastPage: Number(meta.last_page ?? 1),
    };
  },

  getById: async (id: string): Promise<RepositoryDocument> => {
    const response = await api.get(`/api/repository-documents/${id}`);
    return normalizeRepoDoc(unwrapOne(response.data));
  },

  upload: async (
    payload: {
      title: string;
      documentType: string;
      vertical: string;
      client?: string;
      description?: string;
      file: File;
    },
    onProgress?: UploadProgressHandler
  ): Promise<RepositoryDocument> => {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('document_type', payload.documentType);
    form.append('vertical', payload.vertical);
    if (payload.client) form.append('client', payload.client);
    if (payload.description) form.append('description', payload.description);
    form.append('file', payload.file);

    const response = await api.post('/api/repository-documents', form, {
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return normalizeRepoDoc(unwrapOne(response.data));
  },

  update: async (
    id: string,
    payload: {
      title?: string;
      documentType?: string;
      vertical?: string;
      client?: string | null;
      description?: string | null;
    }
  ): Promise<RepositoryDocument> => {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.documentType !== undefined) body.document_type = payload.documentType;
    if (payload.vertical !== undefined) body.vertical = payload.vertical;
    if (payload.client !== undefined) body.client = payload.client;
    if (payload.description !== undefined) body.description = payload.description;

    const response = await api.put(`/api/repository-documents/${id}`, body);
    return normalizeRepoDoc(unwrapOne(response.data));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/repository-documents/${id}`);
  },
};

export const opportunityDocumentsService = {
  getAll: async (projectId: string): Promise<OpportunityDocument[]> => {
    const response = await api.get(`/api/projects/${projectId}/documents`);
    return unwrapList(response.data).map(normalizeOppDoc);
  },

  getById: async (projectId: string, docId: string): Promise<OpportunityDocument> => {
    const response = await api.get(`/api/projects/${projectId}/documents/${docId}`);
    return normalizeOppDoc(unwrapOne(response.data));
  },

  upload: async (
    projectId: string,
    payload: { title: string; documentType: string; file: File },
    onProgress?: UploadProgressHandler
  ): Promise<OpportunityDocument> => {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('document_type', payload.documentType);
    form.append('file', payload.file);

    const response = await api.post(`/api/projects/${projectId}/documents`, form, {
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return normalizeOppDoc(unwrapOne(response.data));
  },

  delete: async (projectId: string, docId: string): Promise<void> => {
    await api.delete(`/api/projects/${projectId}/documents/${docId}`);
  },
};
