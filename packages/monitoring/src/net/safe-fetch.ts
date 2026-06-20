import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF protection for outbound provider fetches (Xtream / M3U imports, connectivity
 * tests). User-controlled URLs must never be allowed to reach loopback, link-local,
 * private, cloud-metadata or otherwise internal addresses.
 *
 * Defence in depth:
 *  - protocol allowlist (http/https only — no file:, ftp:, gopher: ...)
 *  - the WHATWG URL parser canonicalises unusual IPv4 notations (decimal/hex/octal)
 *    into dotted-decimal, which is then range-checked
 *  - DNS resolution of the host with every returned address range-checked
 *  - redirects are followed manually and re-validated on every hop
 *  - hard response-size cap and request timeout
 *
 * Residual risk: a tiny TOCTOU window exists between DNS validation and the socket
 * connect (DNS rebinding). Blocking the operator-controlled set of internal hosts at
 * the network layer remains the strongest mitigation; see docs/security.md.
 */
export class SsrfError extends Error {
  readonly code = 'SSRF_BLOCKED';

  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

export type LookupResult = { address: string; family: number };
export type LookupFn = (hostname: string) => Promise<LookupResult[]>;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 16 * 1024 * 1024; // 16 MiB

/**
 * Returns true when the operator has explicitly opted in to allowing private /
 * internal provider hosts. Defaults to a secure `false`.
 */
export function arePrivateProviderHostsAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_PRIVATE_PROVIDER_HOSTS === 'true';
}

const defaultLookup: LookupFn = async (hostname) => {
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => ({ address: entry.address, family: entry.family }));
};

function ipv4Octets(ip: string): [number, number, number, number] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
  return octets as [number, number, number, number];
}

function isPrivateIpv4(ip: string): boolean {
  const octets = ipv4Octets(ip);
  if (!octets) return true; // unparseable → treat as unsafe
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24 reserved
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + 255.255.255.255
  return false;
}

function expandIpv6(ip: string): number[] | null {
  let address = ip;
  const zoneIndex = address.indexOf('%');
  if (zoneIndex !== -1) address = address.slice(0, zoneIndex);

  // IPv4-embedded form, e.g. ::ffff:127.0.0.1 — rewrite the dotted tail as two groups.
  if (address.includes('.')) {
    const lastColon = address.lastIndexOf(':');
    if (lastColon === -1) return null;
    const octets = ipv4Octets(address.slice(lastColon + 1));
    if (!octets) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    address = `${address.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = address.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];

  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...new Array<string>(missing).fill('0'), ...tail];
  }
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    const value = Number.parseInt(group, 16);
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
}

function isPrivateIpv6Bytes(bytes: number[]): boolean {
  const first = bytes[0] ?? 0;
  // IPv4-mapped ::ffff:a.b.c.d
  if (bytes.slice(0, 10).every((value) => value === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isPrivateIpv4(`${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`);
  }
  // ::, ::1 and the deprecated IPv4-compatible ::a.b.c.d range.
  if (bytes.slice(0, 12).every((value) => value === 0)) return true;
  if ((first & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (first === 0xfe && (bytes[1]! & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (first === 0xff) return true; // ff00::/8 multicast
  return false;
}

/** Returns true when an IP literal targets a loopback/private/reserved range. */
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) {
    const bytes = expandIpv6(ip);
    if (!bytes) return true;
    return isPrivateIpv6Bytes(bytes);
  }
  return true; // not a valid IP literal → unsafe
}

export type SafeUrlOptions = {
  allowPrivate?: boolean;
  lookup?: LookupFn;
};

/**
 * Validates that `rawUrl` is safe to fetch and returns the parsed URL.
 * Throws {@link SsrfError} for disallowed protocols or internal targets.
 */
export async function assertSafeUrl(rawUrl: string | URL, options: SafeUrlOptions = {}): Promise<URL> {
  let url: URL;
  try {
    url = typeof rawUrl === 'string' ? new URL(rawUrl) : rawUrl;
  } catch {
    throw new SsrfError('Provider URL is not a valid absolute URL.');
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new SsrfError(`Protocol "${url.protocol}" is not allowed for provider URLs.`);
  }

  const allowPrivate = options.allowPrivate ?? arePrivateProviderHostsAllowed();
  if (allowPrivate) return url;

  // url.hostname is already WHATWG-canonicalised (decimal/hex/octal IPv4 → dotted, IPv6 lower-cased).
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) throw new SsrfError('Provider URL host is empty.');

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new SsrfError('Provider URL targets a blocked internal address.');
    return url;
  }

  const lowered = hostname.toLowerCase();
  if (lowered === 'localhost' || lowered === 'localhost.localdomain' || lowered.endsWith('.localhost')) {
    throw new SsrfError('Provider URL host is not allowed.');
  }

  const lookup = options.lookup ?? defaultLookup;
  let resolved: LookupResult[];
  try {
    resolved = await lookup(hostname);
  } catch {
    throw new SsrfError('Provider URL host could not be resolved.');
  }
  if (resolved.length === 0) {
    throw new SsrfError('Provider URL host did not resolve to any address.');
  }
  for (const entry of resolved) {
    if (isPrivateIp(entry.address)) {
      throw new SsrfError('Provider URL resolves to a blocked internal address.');
    }
  }
  return url;
}

export type SafeFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  allowPrivate?: boolean;
  lookup?: LookupFn;
  fetchImpl?: typeof fetch;
};

export type SafeResponse = {
  ok: boolean;
  status: number;
  headers: Headers;
  url: string;
  bytes: Uint8Array;
  text(): string;
  json<T = unknown>(): T;
};

function combineSignals(external: AbortSignal | undefined, internal: AbortSignal): AbortSignal {
  if (!external) return internal;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([external, internal]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (external.aborted || internal.aborted) controller.abort();
  external.addEventListener('abort', abort, { once: true });
  internal.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SsrfError('Provider response exceeded the maximum allowed size.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * SSRF-hardened `fetch`. Validates the target (and every redirect hop), enforces a
 * response-size cap and a hard timeout, and never auto-follows redirects to
 * unvalidated destinations.
 */
export async function safeFetch(rawUrl: string | URL, options: SafeFetchOptions = {}): Promise<SafeResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const method = options.method ?? 'GET';
  const urlOptions: SafeUrlOptions = {
    ...(options.allowPrivate !== undefined ? { allowPrivate: options.allowPrivate } : {}),
    ...(options.lookup ? { lookup: options.lookup } : {}),
  };

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = combineSignals(options.signal, timeoutController.signal);

  try {
    let current = await assertSafeUrl(rawUrl, urlOptions);
    for (let redirects = 0; ; redirects += 1) {
      const response = await fetchImpl(current.toString(), {
        method,
        redirect: 'manual',
        signal,
        ...(options.headers ? { headers: options.headers } : {}),
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirects >= maxRedirects) {
          throw new SsrfError('Too many redirects while fetching provider URL.');
        }
        const location = response.headers.get('location');
        if (!location) throw new SsrfError('Redirect response is missing a Location header.');
        await response.body?.cancel();
        current = await assertSafeUrl(new URL(location, current), urlOptions);
        continue;
      }

      const bytes = await readBounded(response, maxBytes);
      return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        url: response.url,
        bytes,
        text: () => new TextDecoder().decode(bytes),
        json: <T = unknown>() => JSON.parse(new TextDecoder().decode(bytes)) as T,
      };
    }
  } finally {
    clearTimeout(timer);
  }
}
