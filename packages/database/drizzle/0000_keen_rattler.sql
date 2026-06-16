CREATE TYPE "public"."channel_priority" AS ENUM('critical', 'reference', 'manual', 'retry');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('online', 'degraded', 'offline', 'unknown', 'paused');--> statement-breakpoint
CREATE TYPE "public"."check_status" AS ENUM('success', 'failed', 'timeout', 'partial');--> statement-breakpoint
CREATE TYPE "public"."error_code" AS ENUM('CONNECT_TIMEOUT', 'DNS_ERROR', 'HTTP_401', 'HTTP_403', 'HTTP_404', 'HTTP_429', 'HTTP_500', 'NO_VIDEO', 'NO_AUDIO', 'STREAM_ENDED', 'DECODER_ERROR', 'STARTUP_TOO_SLOW', 'LOW_BITRATE', 'FREEZE_DETECTED', 'BLACK_SCREEN', 'UNKNOWN_ERROR');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('xtream', 'm3u');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
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
CREATE TABLE "channel_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
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
	CONSTRAINT "channel_checks_http_status_valid" CHECK ("channel_checks"."http_status" is null or ("channel_checks"."http_status" >= 100 and "channel_checks"."http_status" <= 599)),
	CONSTRAINT "channel_checks_non_negative_timings" CHECK (coalesce("channel_checks"."connection_ms", 0) >= 0 and coalesce("channel_checks"."first_byte_ms", 0) >= 0 and coalesce("channel_checks"."check_duration_ms", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"category_id" uuid,
	"external_stream_id" text,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"logo_path" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"monitor_enabled" boolean DEFAULT false NOT NULL,
	"priority" "channel_priority" DEFAULT 'manual' NOT NULL,
	"check_interval_minutes" integer DEFAULT 30 NOT NULL,
	"check_duration_seconds" integer DEFAULT 15 NOT NULL,
	"next_check_at" timestamp with time zone,
	"last_check_at" timestamp with time zone,
	"current_status" "channel_status" DEFAULT 'unknown' NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"consecutive_successes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_check_interval_positive" CHECK ("channels"."check_interval_minutes" > 0),
	CONSTRAINT "channels_check_duration_positive" CHECK ("channels"."check_duration_seconds" > 0),
	CONSTRAINT "channels_failures_non_negative" CHECK ("channels"."consecutive_failures" >= 0),
	CONSTRAINT "channels_successes_non_negative" CHECK ("channels"."consecutive_successes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "daily_channel_stats" (
	"channel_id" uuid NOT NULL,
	"day" date NOT NULL,
	"availability_percent" numeric(5, 2) NOT NULL,
	"incident_count" integer DEFAULT 0 NOT NULL,
	"average_startup_ms" integer,
	"average_bitrate_kbps" integer,
	CONSTRAINT "daily_channel_stats_channel_id_day_pk" PRIMARY KEY("channel_id","day"),
	CONSTRAINT "daily_channel_stats_availability_range" CHECK ("daily_channel_stats"."availability_percent" >= 0 and "daily_channel_stats"."availability_percent" <= 100),
	CONSTRAINT "daily_channel_stats_incident_count_non_negative" CHECK ("daily_channel_stats"."incident_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hourly_channel_stats" (
	"channel_id" uuid NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"checks" integer DEFAULT 0 NOT NULL,
	"successful_checks" integer DEFAULT 0 NOT NULL,
	"availability_percent" numeric(5, 2) NOT NULL,
	"average_startup_ms" integer,
	"average_bitrate_kbps" integer,
	"max_startup_ms" integer,
	CONSTRAINT "hourly_channel_stats_channel_id_hour_pk" PRIMARY KEY("channel_id","hour"),
	CONSTRAINT "hourly_channel_stats_availability_range" CHECK ("hourly_channel_stats"."availability_percent" >= 0 and "hourly_channel_stats"."availability_percent" <= 100),
	CONSTRAINT "hourly_channel_stats_check_counts_valid" CHECK ("hourly_channel_stats"."checks" >= 0 and "hourly_channel_stats"."successful_checks" >= 0 and "hourly_channel_stats"."successful_checks" <= "hourly_channel_stats"."checks")
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
	CONSTRAINT "incidents_failed_checks_positive" CHECK ("incidents"."failed_checks" > 0),
	CONSTRAINT "incidents_recovery_checks_non_negative" CHECK ("incidents"."successful_recovery_checks" >= 0),
	CONSTRAINT "incidents_resolved_when_resolved" CHECK (("incidents"."status" = 'open' and "incidents"."resolved_at" is null) or ("incidents"."status" = 'resolved' and "incidents"."resolved_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "provider_type" NOT NULL,
	"base_url" text NOT NULL,
	"username_encrypted" text,
	"password_encrypted" text,
	"encryption_nonce" text,
	"encryption_tag" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_encrypted_credentials_complete" CHECK ((
    ("providers"."username_encrypted" is null and "providers"."password_encrypted" is null and "providers"."encryption_nonce" is null and "providers"."encryption_tag" is null)
    or ("providers"."username_encrypted" is not null and "providers"."password_encrypted" is not null and "providers"."encryption_nonce" is not null and "providers"."encryption_tag" is not null)
  ))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_checks" ADD CONSTRAINT "channel_checks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_channel_stats" ADD CONSTRAINT "daily_channel_stats_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hourly_channel_stats" ADD CONSTRAINT "hourly_channel_stats_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_provider_external_unique" ON "categories" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "categories_provider_name_idx" ON "categories" USING btree ("provider_id","name");--> statement-breakpoint
CREATE INDEX "channel_checks_channel_checked_at_idx" ON "channel_checks" USING btree ("channel_id","checked_at");--> statement-breakpoint
CREATE INDEX "channel_checks_checked_at_idx" ON "channel_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_provider_external_unique" ON "channels" USING btree ("provider_id","external_stream_id");--> statement-breakpoint
CREATE INDEX "channels_due_idx" ON "channels" USING btree ("monitor_enabled","enabled","next_check_at","priority");--> statement-breakpoint
CREATE INDEX "channels_normalized_idx" ON "channels" USING btree ("provider_id","normalized_name");--> statement-breakpoint
CREATE INDEX "daily_channel_stats_day_idx" ON "daily_channel_stats" USING btree ("day");--> statement-breakpoint
CREATE INDEX "hourly_channel_stats_hour_idx" ON "hourly_channel_stats" USING btree ("hour");--> statement-breakpoint
CREATE INDEX "incidents_channel_status_idx" ON "incidents" USING btree ("channel_id","status");--> statement-breakpoint
CREATE INDEX "incidents_started_at_idx" ON "incidents" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_name_unique" ON "providers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "providers_enabled_idx" ON "providers" USING btree ("enabled");