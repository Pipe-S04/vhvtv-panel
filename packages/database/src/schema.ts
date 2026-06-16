import {
  boolean,
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
  uuid,
} from "drizzle-orm/pg-core";

export const providerType = pgEnum("provider_type", ["xtream", "m3u"]);
export const channelStatus = pgEnum("channel_status", ["online", "degraded", "offline", "unknown", "paused"]);
export const checkStatus = pgEnum("check_status", ["success", "failed", "timeout", "partial"]);
export const incidentStatus = pgEnum("incident_status", ["open", "resolved"]);
export const channelPriority = pgEnum("channel_priority", ["critical", "reference", "manual", "retry"]);
export const errorCode = pgEnum("error_code", [
  "CONNECT_TIMEOUT",
  "DNS_ERROR",
  "HTTP_401",
  "HTTP_403",
  "HTTP_404",
  "HTTP_429",
  "HTTP_500",
  "NO_VIDEO",
  "NO_AUDIO",
  "STREAM_ENDED",
  "DECODER_ERROR",
  "STARTUP_TOO_SLOW",
  "LOW_BITRATE",
  "FREEZE_DETECTED",
  "BLACK_SCREEN",
  "UNKNOWN_ERROR",
]);

export const providers = pgTable("providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: providerType("type").notNull(),
  baseUrl: text("base_url").notNull(),
  usernameEncrypted: text("username_encrypted"),
  passwordEncrypted: text("password_encrypted"),
  encryptionNonce: text("encryption_nonce"),
  encryptionTag: text("encryption_tag"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  providerNameIdx: index("categories_provider_name_idx").on(table.providerId, table.name),
}));

export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  externalStreamId: text("external_stream_id"),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  logoPath: text("logo_path"),
  enabled: boolean("enabled").notNull().default(true),
  monitorEnabled: boolean("monitor_enabled").notNull().default(false),
  priority: channelPriority("priority").notNull().default("manual"),
  checkIntervalMinutes: integer("check_interval_minutes").notNull().default(30),
  checkDurationSeconds: integer("check_duration_seconds").notNull().default(15),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
  lastCheckAt: timestamp("last_check_at", { withTimezone: true }),
  currentStatus: channelStatus("current_status").notNull().default("unknown"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  consecutiveSuccesses: integer("consecutive_successes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dueIdx: index("channels_due_idx").on(table.monitorEnabled, table.enabled, table.nextCheckAt, table.priority),
  normalizedIdx: index("channels_normalized_idx").on(table.providerId, table.normalizedName),
}));

export const channelChecks = pgTable("channel_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  status: checkStatus("status").notNull(),
  connectionMs: integer("connection_ms"),
  firstByteMs: integer("first_byte_ms"),
  firstVideoFrameMs: integer("first_video_frame_ms"),
  firstAudioFrameMs: integer("first_audio_frame_ms"),
  totalStartupMs: integer("total_startup_ms"),
  checkDurationMs: integer("check_duration_ms"),
  receivedBytes: integer("received_bytes"),
  averageBitrateKbps: integer("average_bitrate_kbps"),
  videoCodec: text("video_codec"),
  audioCodec: text("audio_codec"),
  width: integer("width"),
  height: integer("height"),
  fps: numeric("fps", { precision: 8, scale: 3 }),
  audioDetected: boolean("audio_detected").notNull().default(false),
  videoDetected: boolean("video_detected").notNull().default(false),
  decoderErrors: integer("decoder_errors").notNull().default(0),
  freezeDurationMs: integer("freeze_duration_ms"),
  blackDurationMs: integer("black_duration_ms"),
  httpStatus: integer("http_status"),
  errorCode: errorCode("error_code"),
  sanitizedErrorMessage: text("sanitized_error_message"),
}, (table) => ({
  channelCheckedAtIdx: index("channel_checks_channel_checked_at_idx").on(table.channelId, table.checkedAt),
}));

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  status: incidentStatus("status").notNull().default("open"),
  errorCode: errorCode("error_code"),
  failedChecks: integer("failed_checks").notNull().default(1),
  successfulRecoveryChecks: integer("successful_recovery_checks").notNull().default(0),
});

export const hourlyChannelStats = pgTable("hourly_channel_stats", {
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  hour: timestamp("hour", { withTimezone: true }).notNull(),
  checks: integer("checks").notNull().default(0),
  successfulChecks: integer("successful_checks").notNull().default(0),
  availabilityPercent: numeric("availability_percent", { precision: 5, scale: 2 }).notNull(),
  averageStartupMs: integer("average_startup_ms"),
  averageBitrateKbps: integer("average_bitrate_kbps"),
  maxStartupMs: integer("max_startup_ms"),
}, (table) => ({
  pk: primaryKey({ columns: [table.channelId, table.hour] }),
}));

export const dailyChannelStats = pgTable("daily_channel_stats", {
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  availabilityPercent: numeric("availability_percent", { precision: 5, scale: 2 }).notNull(),
  incidentCount: integer("incident_count").notNull().default(0),
  averageStartupMs: integer("average_startup_ms"),
  averageBitrateKbps: integer("average_bitrate_kbps"),
}, (table) => ({
  pk: primaryKey({ columns: [table.channelId, table.day] }),
}));

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
