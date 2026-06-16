import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export interface ReservedMonitoringJob {
  id: string;
  channelId: string;
  priority: string;
  scheduledFor: Date;
  attempts: number;
  payload: unknown;
}

export async function reserveMonitoringJobs(
  db: NodePgDatabase<typeof schema>,
  workerId: string,
  limit = 10,
  leaseSeconds = 300
): Promise<ReservedMonitoringJob[]> {
  const result = await db.execute(sql<ReservedMonitoringJob>`
    with candidates as (
      select id
      from monitoring_jobs
      where scheduled_for <= now()
        and attempts < max_attempts
        and (status = 'pending' or (status = 'leased' and lease_expires_at <= now()))
      order by scheduled_for asc,
        case priority when 'critical' then 0 when 'retry' then 1 when 'reference' then 2 else 3 end,
        created_at asc
      limit ${limit}
      for update skip locked
    )
    update monitoring_jobs j
    set status = 'leased',
        leased_by = ${workerId},
        lease_expires_at = now() + (${leaseSeconds} || ' seconds')::interval,
        attempts = attempts + 1,
        updated_at = now()
    from candidates
    where j.id = candidates.id
    returning j.id, j.channel_id as "channelId", j.priority, j.scheduled_for as "scheduledFor", j.attempts, j.payload
  `);

  return Array.from(result.rows) as unknown as ReservedMonitoringJob[];
}

export async function renewMonitoringJobLease(
  db: NodePgDatabase<typeof schema>,
  jobId: string,
  workerId: string,
  leaseSeconds = 300
) {
  return db.execute(sql`
    update monitoring_jobs
    set lease_expires_at = now() + (${leaseSeconds} || ' seconds')::interval,
        updated_at = now()
    where id = ${jobId} and leased_by = ${workerId} and status in ('leased', 'running')
    returning id
  `);
}

export async function acquireWorkerLock(
  db: NodePgDatabase<typeof schema>,
  name: string,
  scope: string,
  workerId: string,
  leaseSeconds = 300
) {
  return db.execute(sql`
    insert into worker_locks (name, scope, locked_by, lease_expires_at)
    values (${name}, ${scope}, ${workerId}, now() + (${leaseSeconds} || ' seconds')::interval)
    on conflict (name) do update
      set locked_by = excluded.locked_by,
          lease_expires_at = excluded.lease_expires_at,
          updated_at = now()
      where worker_locks.lease_expires_at <= now() or worker_locks.locked_by = ${workerId}
    returning name, locked_by as "lockedBy", lease_expires_at as "leaseExpiresAt"
  `);
}

export function deleteMonitoringRunsOlderThan(days: number) {
  return sql`delete from monitoring_runs where started_at < now() - (${days} || ' days')::interval`;
}

export function deleteMonitoringEventsOlderThan(days: number) {
  return sql`delete from monitoring_events where created_at < now() - (${days} || ' days')::interval`;
}

export function deleteAuditEventsOlderThan(days: number) {
  return sql`delete from audit_events where created_at < now() - (${days} || ' days')::interval`;
}
