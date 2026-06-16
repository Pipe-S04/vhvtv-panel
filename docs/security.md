# Security Foundation

## Secrets

Runtime secrets must be injected through Docker Secrets or mounted files and read with the central Secret Loader. Direct environment values are supported for local development only. If both `NAME` and `NAME_FILE` are present, startup must fail closed to avoid ambiguous secret precedence.

Required high-value secrets:

- `MASTER_KEY` / `MASTER_KEY_FILE`: 32-byte AES key encoded as base64 or 64-character hex.
- `POSTGRES_PASSWORD` / `POSTGRES_PASSWORD_FILE`: database password.

## Encryption

Provider credentials and stream access material are encrypted with AES-256-GCM. Each encryption operation uses a fresh 96-bit nonce and emits versioned payload metadata containing algorithm, nonce, authentication tag, and ciphertext. Callers should provide stable authenticated data such as a provider id to bind ciphertext to its owning record.

## Logging and Errors

All API and worker logging must pass sensitive values through central redaction before writing logs. Public errors must be sanitized before returning responses or alert text. The redaction layer removes URLs, credential-bearing query values, authorization/cookie headers, and sensitive object keys such as passwords, tokens, secrets, API keys, and usernames.

## Configuration Validation

Configuration is parsed with the central Zod schema. Security-sensitive defaults are constrained in code: worker concurrency is exactly `1`, timeout and cooldown values have lower bounds, log levels are enumerated, and the master encryption key must decode to exactly 32 bytes.
