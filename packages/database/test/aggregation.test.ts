import { describe, expect, it, vi } from 'vitest';
import { aggregateDailyChannelStats, aggregateHourlyChannelStats, runAggregationJobs } from '../src/aggregation.js';

function sqlText(query: unknown): string {
  return ((query as { queryChunks?: unknown[] }).queryChunks ?? [])
    .map((chunk) => {
      if (typeof chunk === 'string' || typeof chunk === 'number') return String(chunk);
      const value = (chunk as { value?: unknown[] }).value;
      return Array.isArray(value) ? value.join('') : '?';
    })
    .join(' ');
}

const window = {
  from: new Date('2026-01-01T00:00:00.000Z'),
  to: new Date('2026-01-02T00:00:00.000Z')
};

describe('aggregation jobs', () => {
  it('builds hourly upserts from raw channel checks', () => {
    const text = sqlText(aggregateHourlyChannelStats(window));

    expect(text).toContain('insert into hourly_channel_stats');
    expect(text).toContain('from channel_checks');
    expect(text).toContain("date_trunc('hour', checked_at)");
    expect(text).toContain("count(*) filter (where status = 'success')");
    expect(text).toContain('on conflict (channel_id, hour) do update');
  });

  it('builds daily upserts from hourly stats and incident counts', () => {
    const text = sqlText(aggregateDailyChannelStats(window));

    expect(text).toContain('insert into daily_channel_stats');
    expect(text).toContain('from hourly_channel_stats h');
    expect(text).toContain('from incidents i');
    expect(text).toContain('incident_count');
    expect(text).toContain('on conflict (channel_id, day) do update');
  });

  it('runs hourly before daily aggregations', async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rowCount: 11 }).mockResolvedValueOnce({ rowCount: 13 });

    await expect(runAggregationJobs({ execute } as never, window)).resolves.toEqual({ hourlyRows: 11, dailyRows: 13 });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
