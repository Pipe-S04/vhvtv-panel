import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  decryptSecretField,
  decryptString,
  decodeMasterKey,
  encryptSecretField,
  encryptString,
} from '../src/crypto.js';

describe('AES-256-GCM credential encryption', () => {
  it('round-trips plaintext with authenticated data', () => {
    const key = randomBytes(32);
    const encrypted = encryptString('user:pass@example', key, 'provider:1');

    expect(encrypted.alg).toBe('AES-256-GCM');
    expect(decryptString(encrypted, key, 'provider:1')).toBe('user:pass@example');
  });

  it('rejects tampered authenticated data', () => {
    const key = randomBytes(32);
    const encrypted = encryptString('secret', key, 'provider:1');

    expect(() => decryptString(encrypted, key, 'provider:2')).toThrow();
  });

  it('accepts base64 and hex 32-byte master keys only', () => {
    const key = randomBytes(32);

    expect(decodeMasterKey(key.toString('base64'))).toHaveLength(32);
    expect(decodeMasterKey(key.toString('hex'))).toHaveLength(32);
    expect(() => decodeMasterKey(Buffer.from('short').toString('base64'))).toThrow();
  });

  it('serializes independent secret fields with separate nonces and tags', () => {
    const key = randomBytes(32);
    const username = encryptSecretField('alice', key, 'provider:1:username');
    const password = encryptSecretField('secret', key, 'provider:1:password');

    expect(username).not.toBe(password);
    expect(decryptSecretField(username, key, 'provider:1:username')).toBe('alice');
    expect(decryptSecretField(password, key, 'provider:1:password')).toBe('secret');
    expect(() => decryptSecretField(password, key, 'provider:1:username')).toThrow();
  });
});
