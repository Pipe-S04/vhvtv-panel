import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadSecret } from '../src/secrets.js';

describe('secret loader', () => {
  it('loads direct secrets without reading file aliases', () => {
    expect(loadSecret('API_TOKEN', { env: { API_TOKEN: 'direct-secret' } })).toBe('direct-secret');
  });

  it('loads secrets from approved file aliases', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vhvtv-secret-'));
    const secretPath = join(dir, 'secret.txt');
    writeFileSync(secretPath, 'file-secret\n', 'utf8');

    expect(
      loadSecret('POSTGRES_PASSWORD', {
        env: { DATABASE_PASSWORD_FILE: secretPath },
        fileKeys: ['POSTGRES_PASSWORD_FILE', 'DATABASE_PASSWORD_FILE'],
      })
    ).toBe('file-secret');
  });

  it('rejects conflicting direct and file secrets', () => {
    expect(() =>
      loadSecret('MASTER_KEY', {
        env: { MASTER_KEY: 'direct', MASTER_KEY_FILE: '/tmp/master-key' },
      })
    ).toThrow(/either directly/);
  });
});
