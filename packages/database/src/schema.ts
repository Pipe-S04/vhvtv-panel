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
  PROVIDER_TYPES
} from './enums.js';

export const providerType = pgEnum('provider_type', PROVIDER_TYPES);
export const channelStatus = pgEnum('channel_status', CHANNEL_STATUSES);
export const checkStatus = pgEnum('check_status', CHECK_STATUSES);
export const incidentStatus = pgEnum('incident_status', INCIDENT_STATUSES);
export const channelPriority = pgEnum('channel_priority', CHANNEL_PRIORITIES);
export const errorCode = pgEnum('error_code', ERROR_CODES);

export const providers = pgTable(
  'providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    type: providerType('type').notNull(),
    baseUrl: text('base_url').notNull(),
    usernameEncrypted: text('username_encrypted'),
    passwordEncrypted: text('password_encrypted'),
    encryptionNonce: text('encryption_nonce'),
    encryptionTag: text('encryption_tag'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    nameUnique: uniqueIndex('providers_name_unique').on(table.name),
    enabledIdx: index('providers_enabled_idx').on(table.enabled),
    encryptedCredentialsComplete: check(
      'providers_encrypted_credentials_complete',
      sql`(
    (${table.usernameEncrypted} is null and ${table.passwordEncrypted} is null and ${table.encryptionNonce} is null and ${table.encryptionTag} is null)
    or (${table.usernameEncrypted} is not null and ${table.passwordEncrypted} is not null and ${table.encryptionNonce} is not null and ${table.encryptionTag} is not null)
  )`
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
  (table) => ({
    providerExternalUnique: uniqueIndex('categories_provider_external_unique').on(
      table.providerId,
      table.externalId
    ),
    providerNameIdx: index('categories_provider_name_idx').on(table.providerId, table.name)
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
    logoPath: text('logo_path'),
    enabled: boolean('enabled').notNull().default(true),
    monitorEnabled: boolean('monitor_enabled').notNull().default(false),
    priority: channelPriority('priority').notNull().default('manual'),
    checkIntervalMinutes: integer('check_interval_minutes').notNull().default(30),
    checkDurationSeconds: integer('check_duration_seconds').notNull().default(15),
    nextCheckAt: timestamp('next_check_at', { withTimezone: true }),
    lastCheckAt: timestamp('last_check_at', { withTimezone: true }),
    currentStatus: channelStatus('current_status').notNull().default('unknown'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    consecutiveSuccesses: integer('consecutive_successes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    providerExternalUnique: uniqueIndex('channels_provider_external_unique').on(
      table.providerId,
      table.externalStreamId
    ),
    dueIdx: index('channels_due_idx').on(
      table.monitorEnabled,
      table.enabled,
      table.nextCheckAt,
      table.priority
    ),
    normalizedIdx: index('channels_normalized_idx').on(table.providerId, table.normalizedName),
    intervalPositive: check(
      'channels_check_interval_positive',
      sql`${table.checkIntervalMinutes} > 0`
    ),
    durationPositive: check(
      'channels_check_duration_positive',
      sql`${table.checkDurationSeconds} > 0`
    ),
    failuresNonNegative: check(
      'channels_failures_non_negative',
      sql`${table.consecutiveFailures} >= 0`
    ),
    successesNonNegative: check(
      'channels_successes_non_negative',
      sql`${table.consecutiveSuccesses} >= 0`
    )
  })
);

export const channelChecks = pgTable(
  'channel_checks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
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
  (table) => ({
    channelCheckedAtIdx: index('channel_checks_channel_checked_at_idx').on(
      table.channelId,
      table.checkedAt
    ),
    checkedAtIdx: index('channel_checks_checked_at_idx').on(table.checkedAt),
    httpStatusValid: check(
      'channel_checks_http_status_valid',
      sql`${table.httpStatus} is null or (${table.httpStatus} >= 100 and ${table.httpStatus} <= 599)`
    ),
    nonNegativeTimings: check(
      'channel_checks_non_negative_timings',
      sql`coalesce(${table.connectionMs}, 0) >= 0 and coalesce(${table.firstByteMs}, 0) >= 0 and coalesce(${table.checkDurationMs}, 0) >= 0`
    )
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
  (table) => ({
    channelStatusIdx: index('incidents_channel_status_idx').on(table.channelId, table.status),
    startedAtIdx: index('incidents_started_at_idx').on(table.startedAt),
    failedChecksPositive: check('incidents_failed_checks_positive', sql`${table.failedChecks} > 0`),
    recoveryChecksNonNegative: check(
      'incidents_recovery_checks_non_negative',
      sql`${table.successfulRecoveryChecks} >= 0`
    ),
    resolvedWhenResolved: check(
      'incidents_resolved_when_resolved',
      sql`(${table.status} = 'open' and ${table.resolvedAt} is null) or (${table.status} = 'resolved' and ${table.resolvedAt} is not null)`
    )
  })
);

export const hourlyChannelStats = pgTable(
  'hourly_channel_stats',
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
  (table) => ({
    pk: primaryKey({ columns: [table.channelId, table.hour] }),
    hourIdx: index('hourly_channel_stats_hour_idx').on(table.hour),
    availabilityRange: check(
      'hourly_channel_stats_availability_range',
      sql`${table.availabilityPercent} >= 0 and ${table.availabilityPercent} <= 100`
    ),
    checkCountsValid: check(
      'hourly_channel_stats_check_counts_valid',
      sql`${table.checks} >= 0 and ${table.successfulChecks} >= 0 and ${table.successfulChecks} <= ${table.checks}`
    )
  })
);

export const dailyChannelStats = pgTable(
  'daily_channel_stats',
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
  (table) => ({
    pk: primaryKey({ columns: [table.channelId, table.day] }),
    dayIdx: index('daily_channel_stats_day_idx').on(table.day),
    availabilityRange: check(
      'daily_channel_stats_availability_range',
      sql`${table.availabilityPercent} >= 0 and ${table.availabilityPercent} <= 100`
    ),
    incidentCountNonNegative: check(
      'daily_channel_stats_incident_count_non_negative',
      sql`${table.incidentCount} >= 0`
    )
  })
);

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    entityIdx: index('audit_events_entity_idx').on(table.entityType, table.entityId),
    createdAtIdx: index('audit_events_created_at_idx').on(table.createdAt)
  })
);
