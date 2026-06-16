import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createDatabase } from './client.js';
import * as schema from './schema.js';

export async function seedFoundation(db: NodePgDatabase<typeof schema> = createDatabase()) {
  const [provider] = await db
    .insert(schema.providers)
    .values({
      name: 'Demo M3U Provider',
      type: 'm3u',
      baseUrl: 'https://example.invalid/demo.m3u',
      enabled: false
    })
    .onConflictDoNothing({ target: schema.providers.name })
    .returning();

  if (provider) {
    const [category] = await db
      .insert(schema.categories)
      .values({ providerId: provider.id, externalId: 'demo-news', name: 'News' })
      .onConflictDoNothing()
      .returning();
    const [channel] = await db
      .insert(schema.channels)
      .values({
        providerId: provider.id,
        categoryId: category?.id,
        externalStreamId: 'demo-channel-1',
        name: 'Demo Channel',
        normalizedName: 'demo channel',
        enabled: false
      })
      .onConflictDoNothing()
      .returning();
    if (channel) {
      await db
        .insert(schema.channelMonitoringSettings)
        .values({ channelId: channel.id, monitorEnabled: false })
        .onConflictDoNothing();
      await db
        .insert(schema.channelStatusTable)
        .values({ channelId: channel.id, status: 'unknown' })
        .onConflictDoNothing();
    }
  }

  await db
    .insert(schema.settings)
    .values([
      { key: 'monitoring.globalConcurrency', value: 1 },
      { key: 'monitoring.defaultCheckIntervalMinutes', value: 30 },
      { key: 'monitoring.defaultCheckDurationSeconds', value: 15 },
      { key: 'retention.monitoringRunsDays', value: 30 },
      { key: 'retention.monitoringEventsDays', value: 30 },
      { key: 'retention.auditEventsDays', value: 365 },
      { key: 'alerts.telegram.enabled', value: false }
    ])
    .onConflictDoNothing();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedFoundation();
}
