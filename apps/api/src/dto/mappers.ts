import type {
  providers,
  channels,
  categories,
  incidents,
  channelChecks,
  settings,
} from '@vhvtv/database';

type ProviderRow = typeof providers.$inferSelect;
type ChannelRow = typeof channels.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;
type IncidentRow = typeof incidents.$inferSelect;
type CheckRow = typeof channelChecks.$inferSelect;
type SettingRow = typeof settings.$inferSelect;

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
  logoPath: string | null;
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

export function toProviderDto(row: ProviderRow): ProviderDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    enabled: row.enabled,
    hasCredentials: !!(row.usernameEncrypted || row.passwordEncrypted),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toChannelDto(row: ChannelRow): ChannelDto {
  return {
    id: row.id,
    providerId: row.providerId,
    categoryId: row.categoryId,
    name: row.name,
    normalizedName: row.normalizedName,
    logoPath: row.logoPath,
    enabled: row.enabled,
    monitorEnabled: row.monitorEnabled,
    priority: row.priority,
    checkIntervalMinutes: row.checkIntervalMinutes,
    checkDurationSeconds: row.checkDurationSeconds,
    nextCheckAt: row.nextCheckAt?.toISOString() ?? null,
    lastCheckAt: row.lastCheckAt?.toISOString() ?? null,
    currentStatus: row.currentStatus,
    consecutiveFailures: row.consecutiveFailures,
    consecutiveSuccesses: row.consecutiveSuccesses,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCategoryDto(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    providerId: row.providerId,
    externalId: row.externalId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toIncidentDto(
  row: IncidentRow,
  channelName?: string
): IncidentDto {
  return {
    id: row.id,
    channelId: row.channelId,
    ...(channelName !== undefined ? { channelName } : {}),
    startedAt: row.startedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    status: row.status,
    errorCode: row.errorCode,
    failedChecks: row.failedChecks,
    successfulRecoveryChecks: row.successfulRecoveryChecks,
  };
}

export function toCheckDto(row: CheckRow): CheckDto {
  return {
    id: row.id,
    channelId: row.channelId,
    checkedAt: row.checkedAt.toISOString(),
    status: row.status,
    connectionMs: row.connectionMs,
    firstByteMs: row.firstByteMs,
    totalStartupMs: row.totalStartupMs,
    checkDurationMs: row.checkDurationMs,
    averageBitrateKbps: row.averageBitrateKbps,
    videoCodec: row.videoCodec,
    audioCodec: row.audioCodec,
    width: row.width,
    height: row.height,
    audioDetected: row.audioDetected,
    videoDetected: row.videoDetected,
    decoderErrors: row.decoderErrors,
    httpStatus: row.httpStatus,
    errorCode: row.errorCode,
    sanitizedErrorMessage: row.sanitizedErrorMessage,
  };
}

export function toSettingDto(row: SettingRow): SettingDto {
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt.toISOString(),
  };
}
