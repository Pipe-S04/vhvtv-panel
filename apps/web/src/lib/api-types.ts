/** Mirror of API DTOs (client-safe -- no credentials or stream URLs) */

export type ProviderDto = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  hasCredentials: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChannelDto = {
  id: string;
  providerId: string;
  categoryId: string | null;
  name: string;
  normalizedName: string;
  enabled: boolean;
  monitorEnabled: boolean;
  priority: string;
  checkIntervalMinutes: number;
  checkDurationSeconds: number;
  nextCheckAt: string | null;
  lastCheckAt: string | null;
  currentStatus: string;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryDto = {
  id: string;
  providerId: string;
  externalId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type IncidentDto = {
  id: string;
  channelId: string;
  channelName?: string;
  startedAt: string;
  resolvedAt: string | null;
  status: string;
  errorCode: string | null;
  failedChecks: number;
  successfulRecoveryChecks: number;
};

export type CheckDto = {
  id: string;
  channelId: string;
  checkedAt: string;
  status: string;
  connectionMs: number | null;
  firstByteMs: number | null;
  totalStartupMs: number | null;
  checkDurationMs: number | null;
  averageBitrateKbps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number | null;
  height: number | null;
  audioDetected: boolean;
  videoDetected: boolean;
  decoderErrors: number;
  httpStatus: number | null;
  errorCode: string | null;
  sanitizedErrorMessage: string | null;
};

export type SettingDto = {
  key: string;
  value: unknown;
  updatedAt: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DashboardDto = {
  monitoredChannels: number;
  online: number;
  degraded: number;
  offline: number;
  unknown: number;
  averageStartupMs: number;
  availability24h: number;
  activeIncidents: number;
};

export type StatusSummaryDto = {
  recentChecks: CheckDto[];
  problematicChannels: ChannelDto[];
};

export type AvailabilityStatDto = {
  channelId: string;
  channelName: string;
  availabilityPercent: number;
  totalChecks: number;
  successfulChecks: number;
};

export type StartupTimeStatDto = {
  channelId: string;
  channelName: string;
  avgStartupMs: number;
  minStartupMs: number;
  maxStartupMs: number;
  checkCount: number;
};

export type BitrateStatDto = {
  channelId: string;
  channelName: string;
  avgBitrateKbps: number;
  minBitrateKbps: number;
  maxBitrateKbps: number;
  checkCount: number;
};

export type MonitoringStatusDto = {
  paused: boolean;
};
