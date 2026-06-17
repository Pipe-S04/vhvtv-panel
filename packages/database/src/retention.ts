import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export const RETENTION_POLICIES = {
  rawMeasurementsDays: 90,
  detailedErrorsDays: 30,
  hourlyAggregationsDays: 365,
  dailyAggregationsDays: 730,
  auditEventsDays: 365
} as const;

export type RetentionSummary = {
  rawMeasurementsDeleted: number;
  resolvedIncidentsDeleted: number;
  hourlyAggregationsDeleted: number;
  dailyAggregationsDeleted: number;
  auditEventsDeleted: number;
};

function affectedRows(result: { rowCount?: number | null }): number {
  return result.rowCount ?? 0;
}

export function deleteRawMeasurementsOlderThan(days = RETENTION_POLICIES.rawMeasurementsDays) {
  return sql`delete from channel_checks where checked_at < now() - (${days} || ' days')::interval`;
}

export function deleteResolvedIncidentsOlderThan(days = RETENTION_POLICIES.detailedErrorsDays) {
  return sql`
    delete from incidents
    where status = 'resolved'
      and resolved_at is not null
      and resolved_at < now() - (${days} || ' days')::interval
  `;
}

export function deleteHourlyAggregationsOlderThan(days = RETENTION_POLICIES.hourlyAggregationsDays) {
  return sql`delete from hourly_channel_stats where hour < now() - (${days} || ' days')::interval`;
}

export function deleteDailyAggregationsOlderThan(days = RETENTION_POLICIES.dailyAggregationsDays) {
  return sql`delete from daily_channel_stats where day < (current_date - (${days} || ' days')::interval)::date`;
}

export function deleteAuditEventsOlderThan(days = RETENTION_POLICIES.auditEventsDays) {
  return sql`delete from audit_events where created_at < now() - (${days} || ' days')::interval`;
}

export async function runRetentionCleanup(db: NodePgDatabase<typeof schema>): Promise<RetentionSummary> {
  const [
    rawMeasurements,
    resolvedIncidents,
    hourlyAggregations,
    dailyAggregations,
    auditEvents
  ] = await Promise.all([
    db.execute(deleteRawMeasurementsOlderThan()),
    db.execute(deleteResolvedIncidentsOlderThan()),
    db.execute(deleteHourlyAggregationsOlderThan()),
    db.execute(deleteDailyAggregationsOlderThan()),
    db.execute(deleteAuditEventsOlderThan())
  ]);

  return {
    rawMeasurementsDeleted: affectedRows(rawMeasurements),
    resolvedIncidentsDeleted: affectedRows(resolvedIncidents),
    hourlyAggregationsDeleted: affectedRows(hourlyAggregations),
    dailyAggregationsDeleted: affectedRows(dailyAggregations),
    auditEventsDeleted: affectedRows(auditEvents)
  };
}
