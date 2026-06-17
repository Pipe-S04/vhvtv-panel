import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export type AggregationWindow = {
  from: Date;
  to: Date;
};

export type AggregationSummary = {
  hourlyRows: number;
  dailyRows: number;
};

function affectedRows(result: { rowCount?: number | null }): number {
  return result.rowCount ?? 0;
}

export function aggregateHourlyChannelStats({ from, to }: AggregationWindow) {
  return sql`
    insert into hourly_channel_stats (
      channel_id,
      hour,
      checks,
      successful_checks,
      availability_percent,
      average_startup_ms,
      average_bitrate_kbps,
      max_startup_ms
    )
    select
      channel_id,
      date_trunc('hour', checked_at) as hour,
      count(*)::integer as checks,
      count(*) filter (where status = 'success')::integer as successful_checks,
      round((count(*) filter (where status = 'success')::numeric / nullif(count(*), 0)) * 100, 2) as availability_percent,
      round(avg(total_startup_ms))::integer as average_startup_ms,
      round(avg(average_bitrate_kbps))::integer as average_bitrate_kbps,
      max(total_startup_ms)::integer as max_startup_ms
    from channel_checks
    where checked_at >= ${from}
      and checked_at < ${to}
    group by channel_id, date_trunc('hour', checked_at)
    on conflict (channel_id, hour) do update set
      checks = excluded.checks,
      successful_checks = excluded.successful_checks,
      availability_percent = excluded.availability_percent,
      average_startup_ms = excluded.average_startup_ms,
      average_bitrate_kbps = excluded.average_bitrate_kbps,
      max_startup_ms = excluded.max_startup_ms
  `;
}

export function aggregateDailyChannelStats({ from, to }: AggregationWindow) {
  return sql`
    insert into daily_channel_stats (
      channel_id,
      day,
      availability_percent,
      incident_count,
      average_startup_ms,
      average_bitrate_kbps
    )
    select
      h.channel_id,
      h.hour::date as day,
      round((sum(h.successful_checks)::numeric / nullif(sum(h.checks), 0)) * 100, 2) as availability_percent,
      coalesce(i.incident_count, 0)::integer as incident_count,
      round(avg(h.average_startup_ms))::integer as average_startup_ms,
      round(avg(h.average_bitrate_kbps))::integer as average_bitrate_kbps
    from hourly_channel_stats h
    left join lateral (
      select count(*)::integer as incident_count
      from incidents i
      where i.channel_id = h.channel_id
        and i.started_at >= h.hour::date
        and i.started_at < (h.hour::date + interval '1 day')
    ) i on true
    where h.hour >= date_trunc('day', ${from}::timestamptz)
      and h.hour < date_trunc('day', ${to}::timestamptz)
    group by h.channel_id, h.hour::date, i.incident_count
    on conflict (channel_id, day) do update set
      availability_percent = excluded.availability_percent,
      incident_count = excluded.incident_count,
      average_startup_ms = excluded.average_startup_ms,
      average_bitrate_kbps = excluded.average_bitrate_kbps
  `;
}

export async function runAggregationJobs(
  db: NodePgDatabase<typeof schema>,
  window: AggregationWindow
): Promise<AggregationSummary> {
  const hourly = await db.execute(aggregateHourlyChannelStats(window));
  const daily = await db.execute(aggregateDailyChannelStats(window));

  return { hourlyRows: affectedRows(hourly), dailyRows: affectedRows(daily) };
}
