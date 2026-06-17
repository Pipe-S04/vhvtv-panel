# Production Docker Deployment

The Compose stack is runnable as a hardened single-host production baseline. PostgreSQL is never published to the host; only `web` binds to `WEB_BIND` and should normally stay on `127.0.0.1` behind Pangolin, Traefik, Caddy, or another TLS/auth gateway.

## Services

- `web`: public entrypoint, non-root UID `10001`, read-only filesystem, no Linux capabilities, `no-new-privileges`, and a tmpfs `/tmp`.
- `api`: internal API on port `4000`, reachable only on Compose networks, non-root UID `10001`, read-only filesystem, no capabilities, `no-new-privileges`, Docker secrets for database and master keys.
- `worker`: internal monitoring worker with `WORKER_CONCURRENCY=1`, FFmpeg installed in the runtime image, non-root UID `10001`, read-only filesystem, no capabilities, and Docker secrets.
- `postgres`: PostgreSQL 16 on the internal `backend` network only, persistent named volume `postgres_data`, Docker secret password file, no capabilities, and `no-new-privileges`.

## Networks

- `web`: non-internal network for browser-facing web traffic and web-to-API reverse proxy calls.
- `backend`: internal-only network for PostgreSQL, API, and worker traffic.

## First run

```bash
cp .env.example .env
mkdir -p secrets backups
openssl rand -base64 32 > secrets/postgres_password.txt
openssl rand -base64 32 > secrets/master_key.txt
chmod 600 secrets/*.txt
docker compose config
docker compose up --build -d
```

Open <http://127.0.0.1:3000> after all services are healthy.

## Health checks and restart policy

Every service uses `restart: unless-stopped` and a Compose health check. PostgreSQL uses `pg_isready`; Node services call their local HTTP endpoints with Node's built-in `fetch`.

## Backups and restore

Encrypted PostgreSQL backups are produced by `scripts/backup-postgres.sh`. The script refuses to leave an unencrypted dump behind.

Recommended age recipient mode:

```bash
export AGE_RECIPIENT='age1...'
BACKUP_DIR=backups scripts/backup-postgres.sh
```

GPG symmetric fallback:

```bash
printf '%s\n' 'long random backup passphrase' > secrets/backup_passphrase.txt
chmod 600 secrets/backup_passphrase.txt
BACKUP_PASSPHRASE_FILE=secrets/backup_passphrase.txt scripts/backup-postgres.sh
```

Restore into the running `postgres` service:

```bash
AGE_IDENTITY_FILE=secrets/backup_age_identity.txt scripts/restore-postgres.sh backups/postgres-YYYYMMDDTHHMMSSZ.dump.age
# or
BACKUP_PASSPHRASE_FILE=secrets/backup_passphrase.txt scripts/restore-postgres.sh backups/postgres-YYYYMMDDTHHMMSSZ.dump.gpg
```

Test restores regularly against a disposable environment before relying on backups.

## Pangolin / Authentik notes

- Keep `WEB_BIND=127.0.0.1:3000` and publish the app through Pangolin or another reverse proxy rather than exposing containers directly.
- Configure Authentik forward-auth or OIDC at the proxy layer until application-native SSO is implemented.
- Pass `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For`; the API is configured to trust the proxy path.
- Restrict admin routes and API documentation in Authentik/Pangolin policies before enabling public DNS.
