# VHV Stream Monitor

VHV Stream Monitor ist eine geplante, vollständig selbst gehostete Webanwendung für technisches IPTV-Stream-Monitoring aus Xtream Codes oder M3U-Listen.

## Phase 0

Dieses Repository enthält aktuell Phase 0: Architektur, Ziel-Dateistruktur, Datenbankschema-Entwurf und Docker-Compose-Grundlage. Die produktive Implementierung der Anwendungen erfolgt in den nächsten Phasen.

## Kernprinzipien

- Privacy-first und self-hosted
- keine externen Tracking-, Font- oder Telemetrie-Dienste
- keine Speicherung von Video, Audio, Screenshots oder Rohpaketen
- PostgreSQL ohne öffentlichen Port
- Worker-Parallelität exakt `1`
- Stream-Zugangsdaten verschlüsselt per AES-256-GCM
- Secrets ausschließlich über Docker Secrets oder gemountete Dateien

## Dokumentation

- Architektur: [`docs/phase-0-architecture.md`](docs/phase-0-architecture.md)
- Deployment: [`docs/deployment.md`](docs/deployment.md)
- Secrets: [`docs/secrets.md`](docs/secrets.md)
- Compose-Grundlage: [`docker-compose.yml`](docker-compose.yml)

## Lokaler Start

```bash
cp .env.example .env
mkdir -p secrets
openssl rand -base64 32 > secrets/postgres_password.txt
openssl rand -base64 32 > secrets/master_key.txt
chmod 600 secrets/*.txt
docker compose config
docker compose up --build
```

## Sicherheitshinweis

`secrets/` und `.env` dürfen nicht in Git gespeichert werden. API und Worker dürfen niemals vollständige Stream-URLs, Provider-Zugangsdaten oder rohe FFmpeg-Ausgaben loggen oder ausliefern.
