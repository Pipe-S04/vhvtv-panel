import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://vhv:vhv@localhost:5432/vhvtv'
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public'
  },
  strict: true,
  verbose: true
});
