import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@vhvtv/shared': resolve(root, 'packages/shared/src/index.ts'),
      '@vhvtv/database': resolve(root, 'packages/database/src/index.ts'),
    },
  },
});
