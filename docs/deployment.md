# Local Docker Deployment

This phase provides a Docker Compose foundation for local development and future production hardening. It intentionally does not add root package tooling or application implementation.

## Services

- `web`: public entrypoint bound by `WEB_BIND`, defaults to `127.0.0.1:3000`.
- `api`: internal API container, reachable by `web` over the `frontend` network and by `worker`/PostgreSQL over `backend`.
- `worker`: internal stream-check worker with `WORKER_CONCURRENCY=1`.
- `postgres`: PostgreSQL 16 with no host port and only the internal `backend` network.

## Networks

- `frontend`: non-internal network for browser-facing web traffic and web-to-API communication.
- `backend`: internal-only network for PostgreSQL, API, and worker traffic.

## First local run

```bash
cp .env.example .env
mkdir -p secrets
openssl rand -base64 32 > secrets/postgres_password.txt
openssl rand -base64 32 > secrets/master_key.txt
chmod 600 secrets/*.txt
docker compose config
docker compose up --build
```

Open <http://127.0.0.1:3000> after the services become healthy.

## Health checks

Compose defines basic health checks for every service:

- PostgreSQL uses `pg_isready`.
- `web`, `api`, and `worker` check their local `/health` endpoint.

The application Dockerfiles expose foundation health endpoints so Compose health checks are executable before the full services are implemented in later phases.
