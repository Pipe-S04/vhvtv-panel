import { describe, expect, it, vi } from 'vitest';

import {
  arePrivateProviderHostsAllowed,
  assertSafeUrl,
  isPrivateIp,
  safeFetch,
  SsrfError,
  type LookupFn
} from './safe-fetch.js';

const publicLookup: LookupFn = async () => [{ address: '93.184.216.34', family: 4 }];
const privateLookup: LookupFn = async () => [{ address: '10.0.0.5', family: 4 }];

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe('isPrivateIp classification', () => {
  it.each([
    '0.0.0.0',
    '127.0.0.1',
    '10.0.0.1',
    '172.16.5.4',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '100.64.0.1', // CGNAT
    '198.18.0.1',
    '255.255.255.255',
    '224.0.0.1',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254'
  ])('flags %s as private/reserved', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '2606:4700:4700::1111',
    '2001:4860:4860::8888'
  ])('allows public address %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

describe('assertSafeUrl', () => {
  it('rejects non-http(s) protocols', async () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com/']) {
      await expect(assertSafeUrl(url, { lookup: publicLookup })).rejects.toBeInstanceOf(SsrfError);
    }
  });

  it('blocks localhost and loopback literals', async () => {
    for (const url of ['http://localhost/', 'http://127.0.0.1/', 'http://[::1]/']) {
      await expect(assertSafeUrl(url, { lookup: publicLookup })).rejects.toBeInstanceOf(SsrfError);
    }
  });

  it('blocks link-local cloud metadata endpoint', async () => {
    await expect(
      assertSafeUrl('http://169.254.169.254/latest/meta-data/', { lookup: publicLookup })
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it('blocks private IPv4 and IPv6 literals', async () => {
    for (const url of ['http://10.1.2.3/', 'http://192.168.0.10/', 'http://[fc00::1]/']) {
      await expect(assertSafeUrl(url, { lookup: publicLookup })).rejects.toBeInstanceOf(SsrfError);
    }
  });

  it('blocks unusual IPv4 notations (decimal canonicalisation)', async () => {
    // 2130706433 === 127.0.0.1
    await expect(
      assertSafeUrl('http://2130706433/', { lookup: publicLookup })
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it('blocks hostnames that resolve to private addresses (DNS rebinding)', async () => {
    await expect(
      assertSafeUrl('https://internal.example.test/', { lookup: privateLookup })
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it('blocks embedded credentials pointing at internal hosts without leaking them', async () => {
    await expect(
      assertSafeUrl('http://admin:s3cret@127.0.0.1/', { lookup: publicLookup })
    ).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
    await assertSafeUrl('http://admin:s3cret@127.0.0.1/', { lookup: publicLookup }).catch(
      (error: Error) => {
        expect(error.message).not.toContain('s3cret');
      }
    );
  });

  it('allows public hosts and public IP literals', async () => {
    await expect(
      assertSafeUrl('https://provider.example.test/playlist.m3u', { lookup: publicLookup })
    ).resolves.toBeInstanceOf(URL);
    await expect(
      assertSafeUrl('https://8.8.8.8/', { lookup: publicLookup })
    ).resolves.toBeInstanceOf(URL);
  });

  it('honours the explicit allowPrivate opt-in', async () => {
    await expect(
      assertSafeUrl('http://127.0.0.1/', { allowPrivate: true, lookup: publicLookup })
    ).resolves.toBeInstanceOf(URL);
  });
});

describe('safeFetch', () => {
  it('performs a guarded request and exposes parsed JSON', async () => {
    const fetchImpl = vi.fn(jsonFetch({ ok: true }));
    const response = await safeFetch('https://provider.example.test/api', {
      fetchImpl,
      lookup: publicLookup
    });

    expect(response.ok).toBe(true);
    expect(response.json()).toEqual({ ok: true });
    const [calledUrl, init] = fetchImpl.mock.calls[0]!;
    expect(typeof calledUrl).toBe('string');
    expect((init as RequestInit).redirect).toBe('manual');
  });

  it('blocks redirects that target internal addresses', async () => {
    const fetchImpl = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/' }
      })) as unknown as typeof fetch;

    await expect(
      safeFetch('https://provider.example.test/', { fetchImpl, lookup: publicLookup })
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it('aborts responses larger than the byte limit', async () => {
    const fetchImpl = (async () =>
      new Response('x'.repeat(5000), { status: 200 })) as unknown as typeof fetch;

    await expect(
      safeFetch('https://provider.example.test/', {
        fetchImpl,
        lookup: publicLookup,
        maxBytes: 100
      })
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it('enforces a hard timeout', async () => {
    const hangingFetch = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        );
      })) as unknown as typeof fetch;

    await expect(
      safeFetch('https://provider.example.test/', {
        fetchImpl: hangingFetch,
        lookup: publicLookup,
        timeoutMs: 10
      })
    ).rejects.toThrow();
  });
});

describe('arePrivateProviderHostsAllowed', () => {
  it('defaults to false and only opts in on the exact string "true"', () => {
    expect(arePrivateProviderHostsAllowed({})).toBe(false);
    expect(arePrivateProviderHostsAllowed({ ALLOW_PRIVATE_PROVIDER_HOSTS: 'false' })).toBe(false);
    expect(arePrivateProviderHostsAllowed({ ALLOW_PRIVATE_PROVIDER_HOSTS: '1' })).toBe(false);
    expect(arePrivateProviderHostsAllowed({ ALLOW_PRIVATE_PROVIDER_HOSTS: 'true' })).toBe(true);
  });
});
