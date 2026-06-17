CREATE INDEX IF NOT EXISTS "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_list_idx" ON "channels" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_status_idx" ON "channels" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_monitor_status_idx" ON "channels" USING btree ("monitor_enabled","enabled","current_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_provider_name_idx" ON "channels" USING btree ("provider_id","name","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_category_name_idx" ON "channels" USING btree ("category_id","name","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_priority_name_idx" ON "channels" USING btree ("priority","name","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_failures_idx" ON "channels" USING btree ("monitor_enabled","enabled","consecutive_failures" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_checks_checked_at_idx" ON "channel_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_checks_status_checked_at_idx" ON "channel_checks" USING btree ("status","checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incidents_status_started_idx" ON "incidents" USING btree ("status","started_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incidents_resolved_at_idx" ON "incidents" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hourly_channel_stats_hour_idx" ON "hourly_channel_stats" USING btree ("hour");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_channel_stats_day_idx" ON "daily_channel_stats" USING btree ("day");
