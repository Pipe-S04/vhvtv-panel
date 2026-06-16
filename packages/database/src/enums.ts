export const PROVIDER_TYPES = ['xtream', 'm3u'] as const;
export const CHANNEL_STATUSES = [
  'online',
  'suspect',
  'degraded',
  'offline',
  'recovering',
  'unknown',
  'paused'
] as const;
export const CHECK_STATUSES = ['success', 'failed', 'timeout', 'partial'] as const;
export const INCIDENT_STATUSES = ['open', 'resolved'] as const;
export const CHANNEL_PRIORITIES = ['critical', 'reference', 'manual', 'retry'] as const;
export const ERROR_CODES = [
  'CONNECT_TIMEOUT',
  'DNS_ERROR',
  'HTTP_401',
  'HTTP_403',
  'HTTP_404',
  'HTTP_429',
  'HTTP_500',
  'NO_VIDEO',
  'NO_AUDIO',
  'STREAM_ENDED',
  'DECODER_ERROR',
  'STARTUP_TOO_SLOW',
  'LOW_BITRATE',
  'FREEZE_DETECTED',
  'BLACK_SCREEN',
  'UNKNOWN_ERROR'
] as const;
export const MONITORING_JOB_STATUSES = [
  'pending',
  'leased',
  'running',
  'completed',
  'failed',
  'cancelled'
] as const;
export const MONITORING_EVENT_TYPES = [
  'status_change',
  'failure',
  'recovery',
  'metric',
  'log'
] as const;
export const WORKER_LOCK_SCOPES = [
  'monitoring_scheduler',
  'aggregation',
  'retention',
  'provider_import'
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];
export type CheckStatus = (typeof CHECK_STATUSES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type ChannelPriority = (typeof CHANNEL_PRIORITIES)[number];
export type ErrorCode = (typeof ERROR_CODES)[number];
export type MonitoringJobStatus = (typeof MONITORING_JOB_STATUSES)[number];
export type MonitoringEventType = (typeof MONITORING_EVENT_TYPES)[number];
export type WorkerLockScope = (typeof WORKER_LOCK_SCOPES)[number];
