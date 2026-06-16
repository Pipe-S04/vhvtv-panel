const REDACTED = '[REDACTED]';

const SECRET_KEY_PATTERN =
  /(password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|xtream|username|user)/i;
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi;
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

export const pinoRedactionPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.username'
];
