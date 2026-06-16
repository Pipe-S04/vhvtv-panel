CREATE TYPE "public"."channel_priority" AS ENUM('critical', 'reference', 'manual', 'retry');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('online', 'suspect', 'degraded', 'offline', 'recovering', 'unknown', 'paused');--> statement-breakpoint
CREATE TYPE "public"."check_status" AS ENUM('success', 'failed', 'timeout', 'partial');--> statement-breakpoint
CREATE TYPE "public"."error_code" AS ENUM('CONNECT_TIMEOUT', 'DNS_ERROR', 'HTTP_401', 'HTTP_403', 'HTTP_404', 'HTTP_429', 'HTTP_500', 'NO_VIDEO', 'NO_AUDIO', 'STREAM_ENDED', 'DECODER_ERROR', 'STARTUP_TOO_SLOW', 'LOW_BITRATE', 'FREEZE_DETECTED', 'BLACK_SCREEN', 'UNKNOWN_ERROR');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."monitoring_event_type" AS ENUM('status_change', 'failure', 'recovery', 'metric', 'log');--> statement-breakpoint
CREATE TYPE "public"."monitoring_job_status" AS ENUM('pending', 'leased', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('xtream', 'm3u');--> statement-breakpoint
CREATE TYPE "public"."worker_lock_scope" AS ENUM('monitoring_scheduler', 'aggregation', 'retention', 'provider_import');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"channel_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "check_status" NOT NULL,
	"connection_ms" integer,
	"first_byte_ms" integer,
	"first_video_frame_ms" integer,
	"first_audio_frame_ms" integer,
	"total_startup_ms" integer,
	"check_duration_ms" integer,
	"received_bytes" integer,
	"average_bitrate_kbps" integer,
	"video_codec" text,
	"audio_codec" text,
	"width" integer,
	"height" integer,
	"fps" numeric(8, 3),
	"audio_detected" boolean DEFAULT false NOT NULL,
	"video_detected" boolean DEFAULT false NOT NULL,
	"decoder_errors" integer DEFAULT 0 NOT NULL,
	"freeze_duration_ms" integer,
	"black_duration_ms" integer,
	"http_status" integer,
	"error_code" "error_code",
	"sanitized_error_message" text,
	CONSTRAINT "monitoring_runs_http_status_valid" CHECK ("monitoring_runs"."http_status" is null or ("monitoring_runs"."http_status" >= 100 and "monitoring_runs"."http_status" <= 599))
);
--> statement-breakpoint
CREATE TABLE "channel_monitoring_settings" (
	"channel_id" uuid PRIMARY KEY NOT NULL,
	"monitor_enabled" boolean DEFAULT false NOT NULL,
	"priority" "channel_priority" DEFAULT 'manual' NOT NULL,
	"check_interval_minutes" integer DEFAULT 30 NOT NULL,
	"check_duration_seconds" integer DEFAULT 15 NOT NULL,
	"failure_threshold" integer DEFAULT 2 NOT NULL,
	"recovery_threshold" integer DEFAULT 2 NOT NULL,
	"next_check_at" timestamp with time zone,
	"last_check_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_monitoring_settings_interval_positive" CHECK ("channel_monitoring_settings"."check_interval_minutes" > 0),
	CONSTRAINT "channel_monitoring_settings_duration_positive" CHECK ("channel_monitoring_settings"."check_duration_seconds" > 0)
);
--> statement-breakpoint
CREATE TABLE "channel_status" (
	"channel_id" uuid PRIMARY KEY NOT NULL,
	"status" "channel_status" DEFAULT 'unknown' NOT NULL,
	"last_run_id" uuid,
	"last_checked_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"consecutive_successes" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_status_failures_non_negative" CHECK ("channel_status"."consecutive_failures" >= 0)
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"category_id" uuid,
	"external_stream_id" text,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"stream_url_encrypted" text,
	"logo_path" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_aggregates_daily" (
	"channel_id" uuid NOT NULL,
	"day" date NOT NULL,
	"availability_percent" numeric(5, 2) NOT NULL,
	"incident_count" integer DEFAULT 0 NOT NULL,
	"average_startup_ms" integer,
	"average_bitrate_kbps" integer,
	CONSTRAINT "monitoring_aggregates_daily_channel_id_day_pk" PRIMARY KEY("channel_id","day"),
	CONSTRAINT "monitoring_aggregates_daily_availability_range" CHECK ("monitoring_aggregates_daily"."availability_percent" >= 0 and "monitoring_aggregates_daily"."availability_percent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "monitoring_aggregates_hourly" (
	"channel_id" uuid NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"checks" integer DEFAULT 0 NOT NULL,
	"successful_checks" integer DEFAULT 0 NOT NULL,
	"availability_percent" numeric(5, 2) NOT NULL,
	"average_startup_ms" integer,
	"average_bitrate_kbps" integer,
	"max_startup_ms" integer,
	CONSTRAINT "monitoring_aggregates_hourly_channel_id_hour_pk" PRIMARY KEY("channel_id","hour"),
	CONSTRAINT "monitoring_aggregates_hourly_availability_range" CHECK ("monitoring_aggregates_hourly"."availability_percent" >= 0 and "monitoring_aggregates_hourly"."availability_percent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"status" "incident_status" DEFAULT 'open' NOT NULL,
	"error_code" "error_code",
	"failed_checks" integer DEFAULT 1 NOT NULL,
	"successful_recovery_checks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "incidents_failed_checks_positive" CHECK ("incidents"."failed_checks" > 0)
);
--> statement-breakpoint
CREATE TABLE "monitoring_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"channel_id" uuid NOT NULL,
	"type" "monitoring_event_type" NOT NULL,
	"message" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"status" "monitoring_job_status" DEFAULT 'pending' NOT NULL,
	"priority" "channel_priority" DEFAULT 'manual' NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"leased_by" text,
	"lease_expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_jobs_attempts_valid" CHECK ("monitoring_jobs"."attempts" >= 0 and "monitoring_jobs"."max_attempts" > 0)
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
	"provider_id" uuid PRIMARY KEY NOT NULL,
	"username_encrypted" text,
	"password_encrypted" text,
	"encryption_nonce" text NOT NULL,
	"encryption_tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_credentials_secret_present" CHECK ("provider_credentials"."username_encrypted" is not null or "provider_credentials"."password_encrypted" is not null)
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "provider_type" NOT NULL,
	"base_url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_locks" (
	"name" text PRIMARY KEY NOT NULL,
	"scope" "worker_lock_scope" NOT NULL,
	"locked_by" text NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_runs" ADD CONSTRAINT "monitoring_runs_job_id_monitoring_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."monitoring_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_runs" ADD CONSTRAINT "monitoring_runs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_monitoring_settings" ADD CONSTRAINT "channel_monitoring_settings_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_status" ADD CONSTRAINT "channel_status_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_status" ADD CONSTRAINT "channel_status_last_run_id_monitoring_runs_id_fk" FOREIGN KEY ("last_run_id") REFERENCES "public"."monitoring_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_aggregates_daily" ADD CONSTRAINT "monitoring_aggregates_daily_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_aggregates_hourly" ADD CONSTRAINT "monitoring_aggregates_hourly_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_events" ADD CONSTRAINT "monitoring_events_run_id_monitoring_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."monitoring_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_events" ADD CONSTRAINT "monitoring_events_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_jobs" ADD CONSTRAINT "monitoring_jobs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_provider_external_unique" ON "categories" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "categories_provider_name_idx" ON "categories" USING btree ("provider_id","name");--> statement-breakpoint
CREATE INDEX "monitoring_runs_channel_started_idx" ON "monitoring_runs" USING btree ("channel_id","started_at");--> statement-breakpoint
CREATE INDEX "monitoring_runs_started_at_idx" ON "monitoring_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "channel_monitoring_settings_due_idx" ON "channel_monitoring_settings" USING btree ("monitor_enabled","next_check_at","priority");--> statement-breakpoint
CREATE INDEX "channel_status_status_idx" ON "channel_status" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_provider_external_unique" ON "channels" USING btree ("provider_id","external_stream_id");--> statement-breakpoint
CREATE INDEX "channels_normalized_idx" ON "channels" USING btree ("provider_id","normalized_name");--> statement-breakpoint
CREATE INDEX "monitoring_aggregates_daily_day_idx" ON "monitoring_aggregates_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "monitoring_aggregates_hourly_hour_idx" ON "monitoring_aggregates_hourly" USING btree ("hour");--> statement-breakpoint
CREATE INDEX "incidents_channel_status_idx" ON "incidents" USING btree ("channel_id","status");--> statement-breakpoint
CREATE INDEX "incidents_started_at_idx" ON "incidents" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "monitoring_events_channel_created_idx" ON "monitoring_events" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "monitoring_events_type_idx" ON "monitoring_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "monitoring_jobs_reserve_idx" ON "monitoring_jobs" USING btree ("status","scheduled_for","priority");--> statement-breakpoint
CREATE INDEX "monitoring_jobs_lease_idx" ON "monitoring_jobs" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_name_unique" ON "providers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "providers_enabled_idx" ON "providers" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "worker_locks_lease_idx" ON "worker_locks" USING btree ("scope","lease_expires_at");