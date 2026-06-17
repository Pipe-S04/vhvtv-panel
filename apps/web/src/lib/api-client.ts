import type {
  AvailabilityStatDto,
  BitrateStatDto,
  CategoryDto,
  ChannelDto,
  DashboardDto,
  IncidentDto,
  MonitoringStatusDto,
  PaginatedResponse,
  ProviderDto,
  SettingDto,
  StartupTimeStatDto,
  StatusSummaryDto,
} from './api-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] != null && entry[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
}

// ---------------------------------------------------------------------------
// Pagination / filter helpers
// ---------------------------------------------------------------------------

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type ChannelFilters = PaginationParams & {
  providerId?: string;
  categoryId?: string;
  status?: string;
  monitorEnabled?: boolean;
  search?: string;
};

export type IncidentFilters = PaginationParams & {
  status?: string;
  channelId?: string;
};

export type StatFilters = {
  hours?: number;
  channelId?: string;
};

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const api = {
  // Dashboard
  getDashboard: () =>
    request<DashboardDto>('/dashboard'),

  getDashboardIncidents: () =>
    request<{ data: IncidentDto[] }>('/dashboard/incidents'),

  getStatusSummary: () =>
    request<StatusSummaryDto>('/dashboard/status-summary'),

  // Channels
  getChannels: (filters: ChannelFilters = {}) =>
    request<PaginatedResponse<ChannelDto>>(`/channels${qs(filters)}`),

  getChannel: (id: string) =>
    request<ChannelDto>(`/channels/${id}`),

  updateChannel: (id: string, data: Partial<Pick<ChannelDto, 'enabled' | 'monitorEnabled' | 'priority' | 'checkIntervalMinutes' | 'checkDurationSeconds'>>) =>
    request<ChannelDto>(`/channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  triggerCheck: (channelId: string) =>
    request<{ message: string; channelId: string }>(`/channels/${channelId}/check-now`, {
      method: 'POST',
    }),

  bulkMonitor: (channelIds: string[], monitorEnabled: boolean) =>
    request<{ updated: number; monitorEnabled: boolean }>('/channels/bulk-monitor', {
      method: 'POST',
      body: JSON.stringify({ channelIds, monitorEnabled }),
    }),

  // Providers
  getProviders: (params: PaginationParams = {}) =>
    request<PaginatedResponse<ProviderDto>>(`/providers${qs(params)}`),

  getProvider: (id: string) =>
    request<ProviderDto>(`/providers/${id}`),

  createProvider: (data: { name: string; type: string; enabled?: boolean; credentials?: Record<string, unknown> }) =>
    request<ProviderDto>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProvider: (id: string, data: Partial<{ name: string; type: string; enabled: boolean; credentials: Record<string, unknown> }>) =>
    request<ProviderDto>(`/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProvider: (id: string) =>
    request<void>(`/providers/${id}`, { method: 'DELETE' }),

  testProvider: (id: string) =>
    request<{ success: boolean; statusCode: number | null }>(`/providers/${id}/test`, {
      method: 'POST',
    }),

  importProvider: (id: string) =>
    request<{ message: string; providerId: string; existingChannels: number }>(`/providers/${id}/import`, {
      method: 'POST',
    }),

  // Categories
  getCategories: (params: PaginationParams = {}) =>
    request<PaginatedResponse<CategoryDto>>(`/categories${qs(params)}`),

  getCategory: (id: string) =>
    request<CategoryDto & { channelCount: number }>(`/categories/${id}`),

  // Incidents
  getIncidents: (filters: IncidentFilters = {}) =>
    request<PaginatedResponse<IncidentDto>>(`/incidents${qs(filters)}`),

  getIncident: (id: string) =>
    request<IncidentDto>(`/incidents/${id}`),

  acknowledgeIncident: (id: string) =>
    request<{ message: string; incidentId: string }>(`/incidents/${id}/acknowledge`, {
      method: 'POST',
    }),

  // Statistics
  getAvailabilityStats: (filters: StatFilters = {}) =>
    request<{ hours: number; data: AvailabilityStatDto[] }>(`/statistics/availability${qs(filters)}`),

  getStartupTimeStats: (filters: StatFilters = {}) =>
    request<{ hours: number; data: StartupTimeStatDto[] }>(`/statistics/startup-times${qs(filters)}`),

  getBitrateStats: (filters: StatFilters = {}) =>
    request<{ hours: number; data: BitrateStatDto[] }>(`/statistics/bitrates${qs(filters)}`),

  // Settings
  getSettings: () =>
    request<{ data: SettingDto[] }>('/settings'),

  updateSettings: (data: Record<string, unknown>) =>
    request<{ updated: Array<{ key: string; value: unknown }> }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Monitoring
  pauseMonitoring: () =>
    request<{ message: string; paused: true }>('/monitoring/pause', {
      method: 'POST',
    }),

  resumeMonitoring: () =>
    request<{ message: string; paused: false }>('/monitoring/resume', {
      method: 'POST',
    }),

  getMonitoringStatus: () =>
    request<MonitoringStatusDto>('/monitoring/status'),
} as const;

export { ApiError };
