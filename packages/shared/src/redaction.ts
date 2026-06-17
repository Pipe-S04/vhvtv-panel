const REDACTED = '[REDACTED]';

const SECRET_KEY_PATTERN =
  /(password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|set-cookie|xtream|username|user|base[_-]?url|stream[_-]?url|stream|credential|ciphertext|encrypted|encryption|nonce|tag|master[_-]?key)/i;
const URL_PATTERN = /\b(?:https?|rtmps?|rtsp):\/\/[^\s"'<>]+/gi;
const CREDENTIAL_URL_PATTERN = /\b(https?:\/\/)([^\s:@\/]+):([^\s@\/]+)@/gi;
const QUERY_SECRET_PATTERN =
  /([?&](?:password|passwd|pwd|token|secret|api[_-]?key|username|user)=)[^&#\s]+/gi;
const HEADER_SECRET_PATTERN = /\b(authorization|cookie|set-cookie):\s*[^\n\r]+/gi;

export function redactString(input: string): string {
  return input
    .replace(CREDENTIAL_URL_PATTERN, `$1${REDACTED}:${REDACTED}@`)
    .replace(QUERY_SECRET_PATTERN, `$1${REDACTED}`)
    .replace(HEADER_SECRET_PATTERN, `$1: ${REDACTED}`)
    .replace(URL_PATTERN, '[REDACTED_URL]');
}

export function redactObject<T>(value: T): T {
  if (typeof value === 'string') return redactString(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactObject(item)) as T;
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? REDACTED : redactObject(entry)
    ])
  ) as T;
}

export function redactValueForKey<T>(key: string, value: T): T | string {
  return SECRET_KEY_PATTERN.test(key) ? REDACTED : redactObject(value);
}

export const pinoRedactionPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-csrf-token"]',
  'res.headers.set-cookie',
  '*.password',
  '*.passwd',
  '*.pwd',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.masterKey',
  '*.username',
  '*.baseUrl',
  '*.streamUrl',
  '*.stream_url',
  '*.credentials',
  '*.credential',
  '*.ciphertext',
  '*.usernameEncrypted',
  '*.passwordEncrypted',
  '*.encryptionNonce',
  '*.encryptionTag',
  '*.headers.authorization',
  '*.headers.cookie',
  '*.headers.set-cookie',
  'err.message',
  'err.stack',
  'err.cause.message',
  'err.cause.stack'
];
