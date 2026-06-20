import type { LookupFn, SafeFetchOptions } from '../net/safe-fetch.js';

/**
 * Injectable HTTP dependencies for provider importers. Production code uses the
 * defaults (the SSRF-hardened global fetch + DNS lookup); tests inject stubs.
 */
export type HttpFetchDeps = {
  fetchImpl?: typeof fetch;
  lookup?: LookupFn;
  allowPrivate?: boolean;
  maxBytes?: number;
  timeoutMs?: number;
};

export function safeFetchOptions(deps: HttpFetchDeps, signal?: AbortSignal): SafeFetchOptions {
  return {
    ...(signal ? { signal } : {}),
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
    ...(deps.lookup ? { lookup: deps.lookup } : {}),
    ...(deps.allowPrivate !== undefined ? { allowPrivate: deps.allowPrivate } : {}),
    ...(deps.maxBytes !== undefined ? { maxBytes: deps.maxBytes } : {}),
    ...(deps.timeoutMs !== undefined ? { timeoutMs: deps.timeoutMs } : {})
  };
}
