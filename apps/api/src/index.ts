import { createDatabase } from '@vhvtv/database';
import { loadConfig } from '@vhvtv/config';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const connectionString = `postgresql://${config.POSTGRES_USER}:${encodeURIComponent(String(config.POSTGRES_PASSWORD))}@${config.DATABASE_HOST}:${config.DATABASE_PORT}/${config.POSTGRES_DB}`;
  const db = createDatabase(connectionString);

  const app = await buildApp({
    db,
    masterKey: config.MASTER_KEY as Buffer,
    corsOrigin: config.API_PUBLIC_ORIGIN,
    logLevel: config.LOG_LEVEL,
    trustProxy: true,
  });

  await app.listen({ host: config.API_BIND, port: config.PORT });
  app.log.info(`API listening on ${config.API_BIND}:${config.PORT}`);
}

main().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
