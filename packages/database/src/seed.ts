import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createDatabase } from './client.js';
import * as schema from './schema.js';

export async function seedFoundation(db: NodePgDatabase<typeof schema> = createDatabase()) {
  await db
    .insert(schema.providers)
    .values({
      name: 'Demo M3U Provider',
      type: 'm3u',
      baseUrl: 'https://example.invalid/demo.m3u',
      enabled: false
    })
    .onConflictDoNothing({ target: schema.providers.name });

  await db
    .insert(schema.settings)
    .values([
      { key: 'monitoring.globalConcurrency', value: 1 },
      { key: 'monitoring.defaultCheckIntervalMinutes', value: 30 },
      { key: 'monitoring.defaultCheckDurationSeconds', value: 15 },
      { key: 'retention.channelChecksDays', value: 30 },
      { key: 'alerts.telegram.enabled', value: false }
    ])
    .onConflictDoNothing();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedFoundation();
}
