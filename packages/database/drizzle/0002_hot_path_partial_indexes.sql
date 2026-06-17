CREATE INDEX IF NOT EXISTS "channels_due_active_idx" ON "channels" USING btree ("next_check_at","priority","id") WHERE "monitor_enabled" = true AND "enabled" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incidents_open_started_idx" ON "incidents" USING btree ("started_at" DESC,"channel_id") WHERE "status" = 'open';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_checks_recent_success_startup_idx" ON "channel_checks" USING btree ("checked_at","total_startup_ms") WHERE "status" = 'success';
