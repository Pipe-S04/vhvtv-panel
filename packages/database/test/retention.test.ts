import { describe, expect, it, vi } from 'vitest';
import {
  deleteAuditEventsOlderThan,
  deleteDailyAggregationsOlderThan,
  deleteHourlyAggregationsOlderThan,
  deleteRawMeasurementsOlderThan,
  deleteResolvedIncidentsOlderThan,
  runRetentionCleanup
} from '../src/retention.js';

function sqlText(query: unknown): string {
  return ((query as { queryChunks?: unknown[] }).queryChunks ?? [])
    .map((chunk) => {
      if (typeof chunk === 'string' || typeof chunk === 'number') return String(chunk);
      const value = (chunk as { value?: unknown[] }).value;
      return Array.isArray(value) ? value.join('') : '?';
    })
    .join(' ');
}

describe('retention cleanup', () => {
  it('uses the expected retention windows and tables', () => {
    expect(sqlText(deleteRawMeasurementsOlderThan())).toContain('delete from channel_checks');
    expect(sqlText(deleteRawMeasurementsOlderThan())).toContain('90');
    expect(sqlText(deleteResolvedIncidentsOlderThan())).toContain('delete from incidents');
    expect(sqlText(deleteResolvedIncidentsOlderThan())).toContain("status = 'resolved'");
    expect(sqlText(deleteResolvedIncidentsOlderThan())).toContain('resolved_at is not null');
    expect(sqlText(deleteResolvedIncidentsOlderThan())).not.toContain("status = 'open'");
    expect(sqlText(deleteResolvedIncidentsOlderThan())).toContain('30');
    expect(sqlText(deleteHourlyAggregationsOlderThan())).toContain('delete from hourly_channel_stats');
    expect(sqlText(deleteHourlyAggregationsOlderThan())).toContain('365');
    expect(sqlText(deleteDailyAggregationsOlderThan())).toContain('delete from daily_channel_stats');
    expect(sqlText(deleteDailyAggregationsOlderThan())).toContain('730');
    expect(sqlText(deleteAuditEventsOlderThan())).toContain('delete from audit_events');
    expect(sqlText(deleteAuditEventsOlderThan())).toContain('365');
  });

  it('reports affected row counts from all cleanup statements', async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockResolvedValueOnce({ rowCount: 3 })
      .mockResolvedValueOnce({ rowCount: 5 })
      .mockResolvedValueOnce({ rowCount: 7 })
      .mockResolvedValueOnce({ rowCount: 11 });

    await expect(runRetentionCleanup({ execute } as never)).resolves.toEqual({
      rawMeasurementsDeleted: 2,
      resolvedIncidentsDeleted: 3,
      hourlyAggregationsDeleted: 5,
      dailyAggregationsDeleted: 7,
      auditEventsDeleted: 11
    });
    expect(execute).toHaveBeenCalledTimes(5);
  });
});
