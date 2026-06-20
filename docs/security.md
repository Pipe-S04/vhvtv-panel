# Security Foundation

## Secrets

Runtime secrets must be injected through Docker Secrets or mounted files and read with the central Secret Loader. Direct environment values are supported for local development only. If both `NAME` and `NAME_FILE` are present, startup must fail closed to avoid ambiguous secret precedence.

Required high-value secrets:

- `MASTER_KEY` / `MASTER_KEY_FILE`: 32-byte AES key encoded as base64 or 64-character hex.
- `POSTGRES_PASSWORD` / `POSTGRES_PASSWORD_FILE`: database password. `DATABASE_PASSWORD_FILE` is accepted as a backward-compatible file alias only.

## Encryption

Provider credentials and stream access material are encrypted with AES-256-GCM. Each field encryption operation uses a fresh 96-bit nonce and stores a self-contained, versioned payload containing algorithm, nonce, authentication tag, and ciphertext. Callers provide stable authenticated data such as provider id plus field name to bind ciphertext to its owning record and prevent field swapping.

## Logging and Errors

All API and worker logging must pass sensitive values through central redaction before writing logs. Public errors must be sanitized before returning responses or alert text. The redaction layer removes URLs, credential-bearing query values, authorization/cookie headers, and sensitive object keys such as passwords, tokens, secrets, API keys, and usernames.

## HTTP Request Protections

The API rejects oversized request bodies, overlong URLs, unsupported body media types, browser form submissions without `X-CSRF-Token`, and unsafe cross-origin requests when no approved origin matches. The web and API layers both emit restrictive CSP, frame, content-type, referrer, and permissions policy headers. Rate limiting is keyed by client IP and emits standard rate limit headers without exposing server internals.

## Outbound Provider Requests (SSRF)

All outbound HTTP requests that target operator-supplied URLs — Xtream/M3U imports and
the provider connectivity test — go through the SSRF-hardened `safeFetch` guard
(`@vhvtv/monitoring`). The guard:

- allows only `http:` and `https:` (no `file:`, `ftp:`, `gopher:` …);
- relies on WHATWG URL canonicalisation to normalise unusual IPv4 notations (decimal,
  hex, octal) before range checks;
- resolves the host via DNS and rejects the request if **any** resolved address is
  loopback, link-local (incl. the `169.254.169.254` cloud-metadata endpoint), private,
  CGNAT, multicast, or otherwise reserved (IPv4 and IPv6, including IPv4-mapped IPv6);
- follows redirects manually and re-validates every hop, so a redirect cannot escape to
  an internal target;
- enforces a hard request timeout and a maximum response size, streaming the body so an
  oversized playlist is aborted rather than buffered.

The secure default blocks all internal/private targets. To deliberately monitor a
trusted, isolated internal provider, set `ALLOW_PRIVATE_PROVIDER_HOSTS=true`. Leave it
`false` in production. Residual risk: a small TOCTOU window exists between DNS validation
and socket connect (DNS rebinding); blocking internal hosts at the network layer is the
strongest mitigation.

## Configuration Validation

Configuration is parsed with the central Zod schema. Security-sensitive defaults are constrained in code: worker concurrency is exactly `1`, timeout and cooldown values have lower bounds, log levels are enumerated, and the master encryption key must decode to exactly 32 bytes.

## Container Hardening

Production containers run as non-root users, drop all Linux capabilities, enable `no-new-privileges`, and use read-only root filesystems for stateless Node services. Writable paths are limited to tmpfs mounts such as `/tmp`; PostgreSQL writes only to the named `postgres_data` volume and is not published on a host port.

Docker Compose secrets mount sensitive values from `./secrets/*` into `/run/secrets/*`. Production operators should provision equivalent Docker secrets or bind-mounted secret files with restrictive permissions.
