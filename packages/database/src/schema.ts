import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';
import {
  CHANNEL_PRIORITIES,
  CHANNEL_STATUSES,
  CHECK_STATUSES,
  ERROR_CODES,
  INCIDENT_STATUSES,
  MONITORING_EVENT_TYPES,
  MONITORING_JOB_STATUSES,
  PROVIDER_TYPES,
  WORKER_LOCK_SCOPES
} from './enums.js';

export const providerType = pgEnum('provider_type', PROVIDER_TYPES);
export const channelStatus = pgEnum('channel_status', CHANNEL_STATUSES);
export const checkStatus = pgEnum('check_status', CHECK_STATUSES);
export const incidentStatus = pgEnum('incident_status', INCIDENT_STATUSES);
export const channelPriority = pgEnum('channel_priority', CHANNEL_PRIORITIES);
export const errorCode = pgEnum('error_code', ERROR_CODES);
export const monitoringJobStatus = pgEnum('monitoring_job_status', MONITORING_JOB_STATUSES);
export const monitoringEventType = pgEnum('monitoring_event_type', MONITORING_EVENT_TYPES);
export const workerLockScope = pgEnum('worker_lock_scope', WORKER_LOCK_SCOPES);

export const providers = pgTable(
  'providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    type: providerType('type').notNull(),
    baseUrl: text('base_url').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    nameUnique: uniqueIndex('providers_name_unique').on(t.name),
    enabledIdx: index('providers_enabled_idx').on(t.enabled)
  })
);

export const providerCredentials = pgTable(
  'provider_credentials',
  {
    providerId: uuid('provider_id')
      .primaryKey()
      .references(() => providers.id, { onDelete: 'cascade' }),
    usernameEncrypted: text('username_encrypted'),
    passwordEncrypted: text('password_encrypted'),
    encryptionNonce: text('encryption_nonce').notNull(),
    encryptionTag: text('encryption_tag').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    complete: check(
      'provider_credentials_secret_present',
      sql`${t.usernameEncrypted} is not null or ${t.passwordEncrypted} is not null`
    )
  })
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    externalId: text('external_id'),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    providerExternalUnique: uniqueIndex('categories_provider_external_unique').on(
      t.providerId,
      t.externalId
    ),
    providerNameIdx: index('categories_provider_name_idx').on(t.providerId, t.name)
  })
);

export const channels = pgTable(
  'channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    externalStreamId: text('external_stream_id'),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    streamUrlEncrypted: text('stream_url_encrypted'),
    logoPath: text('logo_path'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    providerExternalUnique: uniqueIndex('channels_provider_external_unique').on(
      t.providerId,
      t.externalStreamId
    ),
    normalizedIdx: index('channels_normalized_idx').on(t.providerId, t.normalizedName)
  })
);

export const channelMonitoringSettings = pgTable(
  'channel_monitoring_settings',
  {
    channelId: uuid('channel_id')
      .primaryKey()
      .references(() => channels.id, { onDelete: 'cascade' }),
    monitorEnabled: boolean('monitor_enabled').notNull().default(false),
    priority: channelPriority('priority').notNull().default('manual'),
    checkIntervalMinutes: integer('check_interval_minutes').notNull().default(30),
    checkDurationSeconds: integer('check_duration_seconds').notNull().default(15),
    failureThreshold: integer('failure_threshold').notNull().default(2),
    recoveryThreshold: integer('recovery_threshold').notNull().default(2),
    nextCheckAt: timestamp('next_check_at', { withTimezone: true }),
    lastCheckAt: timestamp('last_check_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    dueIdx: index('channel_monitoring_settings_due_idx').on(
      t.monitorEnabled,
      t.nextCheckAt,
      t.priority
    ),
    intervalPositive: check(
      'channel_monitoring_settings_interval_positive',
      sql`${t.checkIntervalMinutes} > 0`
    ),
    durationPositive: check(
      'channel_monitoring_settings_duration_positive',
      sql`${t.checkDurationSeconds} > 0`
    )
  })
);

export const monitoringJobs = pgTable(
  'monitoring_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    status: monitoringJobStatus('status').notNull().default('pending'),
    priority: channelPriority('priority').notNull().default('manual'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull().defaultNow(),
    leasedBy: text('leased_by'),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    reserveIdx: index('monitoring_jobs_reserve_idx').on(t.status, t.scheduledFor, t.priority),
    leaseIdx: index('monitoring_jobs_lease_idx').on(t.leaseExpiresAt),
    attemptsValid: check(
      'monitoring_jobs_attempts_valid',
      sql`${t.attempts} >= 0 and ${t.maxAttempts} > 0`
    )
  })
);

export const monitoringRuns = pgTable(
  'monitoring_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').references(() => monitoringJobs.id, { onDelete: 'set null' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: checkStatus('status').notNull(),
    connectionMs: integer('connection_ms'),
    firstByteMs: integer('first_byte_ms'),
    firstVideoFrameMs: integer('first_video_frame_ms'),
    firstAudioFrameMs: integer('first_audio_frame_ms'),
    totalStartupMs: integer('total_startup_ms'),
    checkDurationMs: integer('check_duration_ms'),
    receivedBytes: integer('received_bytes'),
    averageBitrateKbps: integer('average_bitrate_kbps'),
    videoCodec: text('video_codec'),
    audioCodec: text('audio_codec'),
    width: integer('width'),
    height: integer('height'),
    fps: numeric('fps', { precision: 8, scale: 3 }),
    audioDetected: boolean('audio_detected').notNull().default(false),
    videoDetected: boolean('video_detected').notNull().default(false),
    decoderErrors: integer('decoder_errors').notNull().default(0),
    freezeDurationMs: integer('freeze_duration_ms'),
    blackDurationMs: integer('black_duration_ms'),
    httpStatus: integer('http_status'),
    errorCode: errorCode('error_code'),
    sanitizedErrorMessage: text('sanitized_error_message')
  },
  (t) => ({
    channelStartedIdx: index('monitoring_runs_channel_started_idx').on(t.channelId, t.startedAt),
    startedAtIdx: index('monitoring_runs_started_at_idx').on(t.startedAt),
    httpStatusValid: check(
      'monitoring_runs_http_status_valid',
      sql`${t.httpStatus} is null or (${t.httpStatus} >= 100 and ${t.httpStatus} <= 599)`
    )
  })
);
export const channelChecks = monitoringRuns;

export const monitoringEvents = pgTable(
  'monitoring_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id').references(() => monitoringRuns.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    type: monitoringEventType('type').notNull(),
    message: text('message'),
    data: jsonb('data').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    channelCreatedIdx: index('monitoring_events_channel_created_idx').on(t.channelId, t.createdAt),
    typeIdx: index('monitoring_events_type_idx').on(t.type)
  })
);

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    status: incidentStatus('status').notNull().default('open'),
    errorCode: errorCode('error_code'),
    failedChecks: integer('failed_checks').notNull().default(1),
    successfulRecoveryChecks: integer('successful_recovery_checks').notNull().default(0)
  },
  (t) => ({
    channelStatusIdx: index('incidents_channel_status_idx').on(t.channelId, t.status),
    startedAtIdx: index('incidents_started_at_idx').on(t.startedAt),
    failedChecksPositive: check('incidents_failed_checks_positive', sql`${t.failedChecks} > 0`)
  })
);

export const channelStatusTable = pgTable(
  'channel_status',
  {
    channelId: uuid('channel_id')
      .primaryKey()
      .references(() => channels.id, { onDelete: 'cascade' }),
    status: channelStatus('status').notNull().default('unknown'),
    lastRunId: uuid('last_run_id').references(() => monitoringRuns.id, { onDelete: 'set null' }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    consecutiveSuccesses: integer('consecutive_successes').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    statusIdx: index('channel_status_status_idx').on(t.status),
    failuresNonNegative: check(
      'channel_status_failures_non_negative',
      sql`${t.consecutiveFailures} >= 0`
    )
  })
);

export const monitoringAggregatesHourly = pgTable(
  'monitoring_aggregates_hourly',
  {
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    hour: timestamp('hour', { withTimezone: true }).notNull(),
    checks: integer('checks').notNull().default(0),
    successfulChecks: integer('successful_checks').notNull().default(0),
    availabilityPercent: numeric('availability_percent', { precision: 5, scale: 2 }).notNull(),
    averageStartupMs: integer('average_startup_ms'),
    averageBitrateKbps: integer('average_bitrate_kbps'),
    maxStartupMs: integer('max_startup_ms')
  },
  (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.hour] }),
    hourIdx: index('monitoring_aggregates_hourly_hour_idx').on(t.hour),
    availabilityRange: check(
      'monitoring_aggregates_hourly_availability_range',
      sql`${t.availabilityPercent} >= 0 and ${t.availabilityPercent} <= 100`
    )
  })
);
export const hourlyChannelStats = monitoringAggregatesHourly;

export const monitoringAggregatesDaily = pgTable(
  'monitoring_aggregates_daily',
  {
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    availabilityPercent: numeric('availability_percent', { precision: 5, scale: 2 }).notNull(),
    incidentCount: integer('incident_count').notNull().default(0),
    averageStartupMs: integer('average_startup_ms'),
    averageBitrateKbps: integer('average_bitrate_kbps')
  },
  (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.day] }),
    dayIdx: index('monitoring_aggregates_daily_day_idx').on(t.day),
    availabilityRange: check(
      'monitoring_aggregates_daily_availability_range',
      sql`${t.availabilityPercent} >= 0 and ${t.availabilityPercent} <= 100`
    )
  })
);
export const dailyChannelStats = monitoringAggregatesDaily;

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    entityIdx: index('audit_events_entity_idx').on(t.entityType, t.entityId),
    createdAtIdx: index('audit_events_created_at_idx').on(t.createdAt)
  })
);
export const workerLocks = pgTable(
  'worker_locks',
  {
    name: text('name').primaryKey(),
    scope: workerLockScope('scope').notNull(),
    lockedBy: text('locked_by').notNull(),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({ leaseIdx: index('worker_locks_lease_idx').on(t.scope, t.leaseExpiresAt) })
);
