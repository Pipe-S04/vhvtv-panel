import { describe, expect, it } from 'vitest';
import * as enums from '../src/enums.js';
import * as database from '../src/index.js';
import {
  deleteAuditEventsOlderThan,
  deleteMonitoringEventsOlderThan,
  deleteMonitoringRunsOlderThan
} from '../src/queries.js';
import * as schema from '../src/schema.js';

describe('database package exports', () => {
  it('exports central enum values', () => {
    expect(enums.PROVIDER_TYPES).toEqual(['xtream', 'm3u']);
    expect(enums.ERROR_CODES).toContain('CONNECT_TIMEOUT');
    expect(enums.MONITORING_JOB_STATUSES).toContain('leased');
  });

  it('loads phase 2 schema tables', () => {
    expect(schema.providers).toBeDefined();
    expect(schema.providerCredentials).toBeDefined();
    expect(schema.categories).toBeDefined();
    expect(schema.channels).toBeDefined();
    expect(schema.channelMonitoringSettings).toBeDefined();
    expect(schema.monitoringJobs).toBeDefined();
    expect(schema.monitoringRuns).toBeDefined();
    expect(schema.monitoringEvents).toBeDefined();
    expect(schema.incidents).toBeDefined();
    expect(schema.channelStatusTable).toBeDefined();
    expect(schema.monitoringAggregatesHourly).toBeDefined();
    expect(schema.monitoringAggregatesDaily).toBeDefined();
    expect(schema.settings).toBeDefined();
    expect(schema.auditEvents).toBeDefined();
    expect(schema.workerLocks).toBeDefined();
  });

  it('re-exports client, schema, enums, seed, and query helpers', () => {
    expect(database.createDatabase).toBeTypeOf('function');
    expect(database.seedFoundation).toBeTypeOf('function');
    expect(database.reserveMonitoringJobs).toBeTypeOf('function');
    expect(database.providers).toBe(schema.providers);
    expect(database.PROVIDER_TYPES).toBe(enums.PROVIDER_TYPES);
  });

  it('builds retention delete SQL helpers', () => {
    expect(deleteMonitoringRunsOlderThan(30).queryChunks.length).toBeGreaterThan(0);
    expect(deleteMonitoringEventsOlderThan(14).queryChunks.length).toBeGreaterThan(0);
    expect(deleteAuditEventsOlderThan(365).queryChunks.length).toBeGreaterThan(0);
  });
});
