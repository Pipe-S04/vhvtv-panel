import { createDatabase } from '@vhvtv/database';
import { loadConfig } from '@vhvtv/config';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const connectionString = `postgresql://${config.POSTGRES_USER}:${encodeURIComponent(String(config.POSTGRES_PASSWORD))}@localhost:5432/${config.POSTGRES_DB}`;
  const db = createDatabase(connectionString);

  const app = await buildApp({
    db,
    masterKey: config.MASTER_KEY as Buffer,
    corsOrigin: config.API_PUBLIC_ORIGIN,
    logLevel: config.LOG_LEVEL,
    trustProxy: true,
  });

  const [host, portStr] = config.WEB_BIND.split(':');
  const port = Number(portStr ?? 3000);

  await app.listen({ host: host ?? '127.0.0.1', port });
  app.log.info(`API listening on ${config.WEB_BIND}`);
}

main().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
