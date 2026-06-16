# Secrets

Runtime secrets are mounted through Docker Compose secrets and are never committed to Git. The local file names are fixed so that Compose can mount them into `/run/secrets/*`.

## Required local files

Create these files before starting the stack:

```bash
mkdir -p secrets
openssl rand -base64 32 > secrets/postgres_password.txt
openssl rand -base64 32 > secrets/master_key.txt
chmod 600 secrets/*.txt
```

| Local file                      | Container mount                  | Used by                 |
| ------------------------------- | -------------------------------- | ----------------------- |
| `secrets/postgres_password.txt` | `/run/secrets/postgres_password` | PostgreSQL, API, worker |
| `secrets/master_key.txt`        | `/run/secrets/master_key`        | API, worker             |

## Rules

- Do not commit `.env`, `.env.*`, or files under `secrets/`.
- Prefer `*_FILE` environment variables for sensitive values.
- Rotate `master_key` only with a planned credential re-encryption procedure.
- PostgreSQL is available only on the internal Compose network and must not publish a host port.
