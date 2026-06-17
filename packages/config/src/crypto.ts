import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type EncryptedPayload = {
  v: 1;
  alg: 'AES-256-GCM';
  iv: string;
  tag: string;
  ciphertext: string;
};

const PAYLOAD_PREFIX = 'enc:v1:';

export function decodeMasterKey(value: string): Buffer {
  const trimmed = value.trim();
  const key = /^[0-9a-f]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, 'hex')
    : Buffer.from(trimmed, 'base64');

  if (key.length !== KEY_BYTES) {
    throw new Error('Master key must decode to exactly 32 bytes for AES-256-GCM.');
  }

  return key;
}

export function encryptString(
  plaintext: string,
  masterKey: Buffer,
  aad?: string
): EncryptedPayload {
  assertMasterKey(masterKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_BYTES });
  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    alg: 'AES-256-GCM',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

export function decryptString(payload: EncryptedPayload, masterKey: Buffer, aad?: string): string {
  assertMasterKey(masterKey);
  if (payload.v !== 1 || payload.alg !== 'AES-256-GCM') {
    throw new Error('Unsupported encrypted payload version or algorithm.');
  }

  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Invalid encrypted payload metadata.');
  }

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_BYTES });
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return `${PAYLOAD_PREFIX}${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`;
}

export function deserializeEncryptedPayload(value: string): EncryptedPayload {
  if (!value.startsWith(PAYLOAD_PREFIX)) {
    throw new Error('Unsupported encrypted payload encoding.');
  }

  const decoded = Buffer.from(value.slice(PAYLOAD_PREFIX.length), 'base64url').toString('utf8');
  const parsed = JSON.parse(decoded) as Partial<EncryptedPayload>;
  if (
    parsed.v !== 1 ||
    parsed.alg !== 'AES-256-GCM' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.tag !== 'string' ||
    typeof parsed.ciphertext !== 'string'
  ) {
    throw new Error('Invalid encrypted payload encoding.');
  }

  return parsed as EncryptedPayload;
}

export function encryptSecretField(plaintext: string, masterKey: Buffer, aad: string): string {
  return serializeEncryptedPayload(encryptString(plaintext, masterKey, aad));
}

export function decryptSecretField(value: string, masterKey: Buffer, aad: string): string {
  return decryptString(deserializeEncryptedPayload(value), masterKey, aad);
}

function assertMasterKey(masterKey: Buffer): void {
  if (masterKey.length !== KEY_BYTES) {
    throw new Error('Master key must be 32 bytes.');
  }
}
