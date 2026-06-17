import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    if (statSync(full).isDirectory()) {
      getAllFiles(full, files);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const SRC_DIR = join(__dirname, '..');
const allFiles = getAllFiles(SRC_DIR);

describe('Security: no credentials in client code', () => {
  it('should not contain password-related variables being rendered', () => {
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/passwordEncrypted/);
      expect(content).not.toMatch(/usernameEncrypted/);
      expect(content).not.toMatch(/encryptionNonce/);
      expect(content).not.toMatch(/encryptionTag/);
      expect(content).not.toMatch(/masterKey/);
    }
  });

  it('should not contain stream URL rendering', () => {
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/streamUrl/i);
      expect(content).not.toMatch(/stream_url/i);
      expect(content).not.toMatch(/externalStreamId/);
    }
  });
});

describe('Security: no external assets', () => {
  it('should not load external CDN fonts', () => {
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/fonts\.googleapis\.com/);
      expect(content).not.toMatch(/fonts\.gstatic\.com/);
      expect(content).not.toMatch(/cdnjs\.cloudflare\.com/);
      expect(content).not.toMatch(/unpkg\.com/);
      expect(content).not.toMatch(/cdn\.jsdelivr\.net/);
    }
  });

  it('should not include external analytics or telemetry', () => {
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/google-analytics/);
      expect(content).not.toMatch(/googletagmanager/);
      expect(content).not.toMatch(/gtag/);
      expect(content).not.toMatch(/hotjar/);
      expect(content).not.toMatch(/mixpanel/);
      expect(content).not.toMatch(/segment\.io/);
      expect(content).not.toMatch(/sentry\.io/);
    }
  });
});
