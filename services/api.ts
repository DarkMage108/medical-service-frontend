// API Service for Backend Integration
// This module handles all HTTP requests to the backend API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types for API responses
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = () => authToken;

// Base fetch function with authentication
const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// ============== AUTH API ==============

export const authApi = {
  login: async (email: string, password: string) => {
    const result = await apiFetch<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(result.token);
    return result;
  },

  register: async (data: { email: string; password: string; name: string; role?: string }) => {
    return apiFetch<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMe: async () => {
    return apiFetch<any>('/auth/me');
  },

  logout: () => {
    setAuthToken(null);
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiFetch<any>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// ============== USERS API ==============

export const usersApi = {
  getAll: async (params?: { role?: string; active?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
    const query = searchParams.toString();
    return apiFetch<PaginatedResponse<any>>(`/users${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/users/${id}`);
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
  },
};

// ============== PATIENTS API ==============

export const patientsApi = {
  getAll: async (params?: {
    search?: string;
    diagnosis?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.diagnosis) searchParams.set('diagnosis', params.diagnosis);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiFetch<PaginatedResponse<any>>(`/patients${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/patients/${id}`);
  },

  create: async (data: any) => {
    return apiFetch<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/patients/${id}`, { method: 'DELETE' });
  },

  recalculateStatus: async (id: string) => {
    return apiFetch<any>(`/patients/${id}/recalculate-status`, { method: 'PATCH' });
  },

  // Guardian
  getGuardian: async (patientId: string) => {
    return apiFetch<any>(`/patients/${patientId}/guardian`);
  },

  updateGuardian: async (patientId: string, data: any) => {
    return apiFetch<any>(`/patients/${patientId}/guardian`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Address
  getAddress: async (patientId: string) => {
    return apiFetch<any>(`/patients/${patientId}/address`);
  },

  upsertAddress: async (patientId: string, data: any) => {
    return apiFetch<any>(`/patients/${patientId}/address`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAddress: async (patientId: string) => {
    return apiFetch<void>(`/patients/${patientId}/address`, { method: 'DELETE' });
  },

  // Documents
  getDocuments: async (patientId: string) => {
    return apiFetch<{ data: any[] }>(`/patients/${patientId}/documents`);
  },

  uploadDocument: async (patientId: string, data: { fileName: string; fileType: string; fileUrl: string }) => {
    return apiFetch<any>(`/patients/${patientId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteDocument: async (documentId: string) => {
    return apiFetch<void>(`/patients/documents/${documentId}`, { method: 'DELETE' });
  },
};

// ============== DIAGNOSES API ==============

export const diagnosesApi = {
  getAll: async () => {
    return apiFetch<{ data: any[] }>('/diagnoses');
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/diagnoses/${id}`);
  },

  create: async (data: { name: string; color?: string }) => {
    return apiFetch<any>('/diagnoses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { name?: string; color?: string }) => {
    return apiFetch<any>(`/diagnoses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/diagnoses/${id}`, { method: 'DELETE' });
  },
};

// ============== MEDICATIONS API ==============

export const medicationsApi = {
  getAll: async () => {
    return apiFetch<{ data: any[] }>('/medications');
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/medications/${id}`);
  },

  create: async (data: any) => {
    return apiFetch<any>('/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/medications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/medications/${id}`, { method: 'DELETE' });
  },
};

// ============== PROTOCOLS API ==============

export const protocolsApi = {
  getAll: async (category?: string) => {
    const query = category ? `?category=${category}` : '';
    return apiFetch<{ data: any[] }>(`/protocols${query}`);
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/protocols/${id}`);
  },

  create: async (data: any) => {
    return apiFetch<any>('/protocols', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/protocols/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/protocols/${id}`, { method: 'DELETE' });
  },
};

// ============== TREATMENTS API ==============

export const treatmentsApi = {
  getAll: async (params?: {
    patientId?: string;
    status?: string;
    protocolId?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.patientId) searchParams.set('patientId', params.patientId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.protocolId) searchParams.set('protocolId', params.protocolId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiFetch<PaginatedResponse<any>>(`/treatments${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/treatments/${id}`);
  },

  create: async (data: any) => {
    return apiFetch<any>('/treatments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/treatments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/treatments/${id}`, { method: 'DELETE' });
  },
};

// ============== DOSES API ==============

export const dosesApi = {
  getAll: async (params?: {
    treatmentId?: string;
    status?: string;
    paymentStatus?: string;
    nurse?: boolean;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.treatmentId) searchParams.set('treatmentId', params.treatmentId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus);
    if (params?.nurse !== undefined) searchParams.set('nurse', String(params.nurse));
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiFetch<PaginatedResponse<any>>(`/doses${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/doses/${id}`);
  },

  create: async (data: any) => {
    return apiFetch<any>('/doses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/doses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/doses/${id}`, { method: 'DELETE' });
  },

  updateSurvey: async (id: string, data: { surveyStatus?: string; surveyScore?: number; surveyComment?: string }) => {
    return apiFetch<any>(`/doses/${id}/survey`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ============== INVENTORY API ==============

export const inventoryApi = {
  getAll: async (params?: {
    search?: string;
    active?: boolean;
    expired?: boolean;
    grouped?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
    if (params?.expired !== undefined) searchParams.set('expired', String(params.expired));
    if (params?.grouped !== undefined) searchParams.set('grouped', String(params.grouped));
    const query = searchParams.toString();
    return apiFetch<{ data: any[] }>(`/inventory${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiFetch<any>(`/inventory/${id}`);
  },

  getAvailable: async (medicationName?: string) => {
    const query = medicationName ? `?medicationName=${encodeURIComponent(medicationName)}` : '';
    return apiFetch<{ data: any[] }>(`/inventory/available${query}`);
  },

  create: async (data: any) => {
    return apiFetch<any>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/inventory/${id}`, { method: 'DELETE' });
  },
};

// ============== DISPENSE LOGS API ==============

export const dispenseLogsApi = {
  getAll: async (params?: {
    patientId?: string;
    medicationName?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.patientId) searchParams.set('patientId', params.patientId);
    if (params?.medicationName) searchParams.set('medicationName', params.medicationName);
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    const query = searchParams.toString();
    return apiFetch<{ data: any[] }>(`/dispense-logs${query ? `?${query}` : ''}`);
  },

  getReport: async (params?: { period?: 'monthly' | 'quarterly' | 'yearly'; year?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.year) searchParams.set('year', String(params.year));
    const query = searchParams.toString();
    return apiFetch<{ data: any[] }>(`/dispense-logs/report${query ? `?${query}` : ''}`);
  },
};

// ============== PURCHASE REQUESTS API ==============

export const purchaseRequestsApi = {
  getAll: async (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return apiFetch<{ data: any[] }>(`/purchase-requests${query}`);
  },

  check: async () => {
    return apiFetch<{ created: any[]; message: string }>('/purchase-requests/check', {
      method: 'POST',
    });
  },

  update: async (id: string, status: string) => {
    return apiFetch<any>(`/purchase-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (id: string) => {
    return apiFetch<void>(`/purchase-requests/${id}`, { method: 'DELETE' });
  },
};

// ============== DASHBOARD API ==============

export const dashboardApi = {
  getStats: async () => {
    return apiFetch<any>('/dashboard/stats');
  },

  getUpcomingContacts: async (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiFetch<{ data: any[] }>(`/dashboard/upcoming-contacts${query}`);
  },

  dismissContact: async (contactId: string) => {
    return apiFetch<any>('/dashboard/dismiss-contact', {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    });
  },

  getActivityWindow: async (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiFetch<{ data: any[] }>(`/dashboard/activity-window${query}`);
  },
};

// ============== DOCUMENTS API ==============

export const documentsApi = {
  getAll: async () => {
    return apiFetch<{ data: any[] }>('/dashboard/documents');
  },

  upload: async (patientId: string, file: File) => {
    // For now, we'll use the patient documents API
    // In a real implementation, this would upload the file to a storage service
    // and then save the URL to the database
    const fileName = file.name;
    const fileType = file.type;
    // Mock URL - in production this would be the actual uploaded file URL
    const fileUrl = `/uploads/${patientId}/${fileName}`;

    return apiFetch<any>(`/patients/${patientId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, fileUrl }),
    });
  },
};

// ============== DISMISSED LOGS API ==============

export const dismissedLogsApi = {
  getAll: async () => {
    return apiFetch<{ data: any[] }>('/dashboard/dismissed-logs');
  },

  dismiss: async (contactId: string) => {
    return apiFetch<any>('/dashboard/dismiss-contact', {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    });
  },
};

// ============== PERMISSIONS API ==============

export interface MenuItem {
  key: string;
  label: string;
  path: string;
  canAccess?: boolean;
}

export interface PermissionsResponse {
  data: Record<string, Record<string, boolean>>;
  menuItems: MenuItem[];
}

export interface MyPermissionsResponse {
  data: MenuItem[];
  permissions: Record<string, boolean>;
}

export const permissionsApi = {
  getAll: async () => {
    return apiFetch<PermissionsResponse>('/permissions');
  },

  getMyPermissions: async () => {
    return apiFetch<MyPermissionsResponse>('/permissions/me');
  },

  getByRole: async (role: string) => {
    return apiFetch<{ data: Record<string, boolean>; menuItems: MenuItem[] }>(`/permissions/${role}`);
  },

  updateRolePermissions: async (role: string, permissions: Record<string, boolean>) => {
    return apiFetch<{ message: string; data: Record<string, boolean> }>(`/permissions/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  },

  resetRolePermissions: async (role: string) => {
    return apiFetch<{ message: string; data: Record<string, boolean> }>(`/permissions/${role}/reset`, {
      method: 'POST',
    });
  },
};

// ============== HEALTH CHECK ==============

export const healthCheck = async () => {
  return apiFetch<{ status: string; timestamp: string }>('/health');
};

// Export default API object
export default {
  auth: authApi,
  permissions: permissionsApi,
  users: usersApi,
  patients: patientsApi,
  diagnoses: diagnosesApi,
  medications: medicationsApi,
  protocols: protocolsApi,
  treatments: treatmentsApi,
  doses: dosesApi,
  inventory: inventoryApi,
  dispenseLogs: dispenseLogsApi,
  purchaseRequests: purchaseRequestsApi,
  dashboard: dashboardApi,
  documents: documentsApi,
  dismissedLogs: dismissedLogsApi,
  healthCheck,
};
