# VHV Stream Monitor – Phase 0 Architektur

## Ziel von Phase 0

Phase 0 legt die produktionsnahe Zielarchitektur fest, ohne bereits die vollständige Anwendung zu implementieren. Sie definiert Monorepo-Struktur, Datenmodell, Deployment-Grenzen und Sicherheitsprinzipien für die folgenden Umsetzungsphasen.

## Architekturübersicht

VHV Stream Monitor wird als selbst gehostetes Monorepo mit klar getrennten Laufzeitprozessen aufgebaut:

- **Web (`apps/web`)**: Next.js App Router, deutsches Dashboard, lokale Assets, keine externen Fonts oder Trackingdienste.
- **API (`apps/api`)**: Fastify REST-API mit Zod-Validierung, Rate Limiting, CSP/CSRF-Schutz, Pino-Logging mit Redaction und Drizzle-Zugriff auf PostgreSQL.
- **Worker (`apps/worker`)**: separater Node.js-Prozess für streamtechnische Checks mit FFmpeg, globaler Parallelität exakt `1`, Watchdog, Prozess-Timeout und Cooldown.
- **Database Package (`packages/database`)**: Drizzle-Schema, Migrationen, Seed-Daten und typsichere Datenbankzugriffe.
- **Monitoring Package (`packages/monitoring`)**: FFmpeg-Runner, Log-Sanitizer, M3U/Xtream-Import, Incident- und Retention-Logik.
- **Shared Package (`packages/shared`)**: gemeinsame DTOs, Statuswerte, Fehlercodes und API-Typen ohne Secrets.
- **Config Package (`packages/config`)**: zentrale, validierte Environment-Konfiguration und Secret-File-Loader.

## Datenschutz- und Sicherheitsgrenzen

- Stream-Zugangsdaten werden nur verschlüsselt gespeichert und niemals an das Frontend übertragen.
- AES-256-GCM nutzt eine zufällige Nonce pro Provider-Datensatz und einen Master-Key aus Docker Secret oder gemounteter Datei.
- API-Antworten enthalten keine Benutzernamen, Passwörter, verschlüsselten Credentials, Stream-URLs oder FFmpeg-Rohlogs.
- FFmpeg wird ausschließlich über `spawn` mit Argument-Array gestartet; Shell-String-Konkatenation ist untersagt.
- PostgreSQL wird nur über interne Docker-Netzwerke verfügbar gemacht und hat keinen öffentlichen Port.
- Es werden keine Video-, Audio-, Screenshot- oder Rohpaketdaten gespeichert.

## Monitoring-Ablauf

1. Worker reserviert den nächsten fälligen Sender in einer PostgreSQL-Transaktion mit `FOR UPDATE SKIP LOCKED`.
2. Worker entschlüsselt Zugangsdaten ausschließlich im Worker-Prozess.
3. Stream-URL wird intern erzeugt und nicht geloggt.
4. FFmpeg öffnet genau eine Stream-Verbindung und misst technische Werte.
5. Sanitizer entfernt URLs, Tokens und Credentials aus Fehlertexten.
6. Check-Ergebnis wird normalisiert gespeichert.
7. Incident-Status wird nach Fehler-/Recovery-Regeln aktualisiert.
8. Optionaler Telegram-Alarm wird cooldown-geschützt versendet.
9. `next_check_at` wird neu berechnet.
10. Worker wartet den Cooldown ab und startet erst danach den nächsten Check.

## Implementierungsabgleich vom 2026-06-17

Die Repository-Struktur ist inzwischen über Phase 0 hinausgewachsen: Web, API, Worker, Datenbank-, Monitoring-, Config-, Shared- und UI-Pakete sind vorhanden. Die grundlegenden Sicherheitsgrenzen aus der Architektur sind weiterhin die Referenz für die Implementierung.

Aktueller Abgleich:

- **Erfüllt:** Monorepo-Workspace, Compose-Servicegrenzen, internes PostgreSQL, zentrale Konfiguration, Secret-Loader, AES-256-GCM-Helfer, API-DTOs ohne Credentials, Redaction, FFmpeg-Aufruf per `spawn`-Argumentarray, deutsches Dashboard und lokale UI-Komponenten.
- **Teilweise erfüllt:** Scheduler-, Importer-, Incident-, Telegram-, Retention- und Aggregationslogik existiert in Paketen und Tests, ist aber noch nicht vollständig über die API-/Worker-Laufzeit verdrahtet.
- **Noch offen:** Der Worker-Entrypoint muss die Monitoring-Schleife ausführen; Provider-Import muss echte Importarbeit starten oder Jobs einreihen; Drizzle-Schema, Migrationen und Migrationsjournal müssen vor Produktionsdatenbanken konsolidiert werden.
- **Release-Gate:** Der finale Review vom 2026-06-17 akzeptiert die Implementierung noch nicht für Produktion, bis Typecheck, Tests, Build, Docker-Validierung, Worker-Check und Importpfade nachweislich grün sind.

Details stehen im finalen Review-Bericht: [`docs/final-acceptance-report.md`](final-acceptance-report.md).

## Geplante Dateistruktur

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── routes
│   │   │   ├── plugins
│   │   │   ├── services
│   │   │   ├── security
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web
│   │   ├── app
│   │   │   ├── channels
│   │   │   ├── categories
│   │   │   ├── incidents
│   │   │   ├── providers
│   │   │   ├── settings
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components
│   │   │   ├── dashboard
│   │   │   ├── layout
│   │   │   └── ui
│   │   ├── lib
│   │   ├── public
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── worker
│       ├── src
│       │   ├── jobs
│       │   ├── scheduler
│       │   ├── shutdown.ts
│       │   └── main.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── packages
│   ├── config
│   │   ├── src
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database
│   │   ├── drizzle
│   │   ├── src
│   │   │   ├── schema.ts
│   │   │   ├── client.ts
│   │   │   └── seed.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── monitoring
│   │   ├── src
│   │   │   ├── ffmpeg
│   │   │   ├── importers
│   │   │   ├── incidents
│   │   │   ├── retention
│   │   │   └── telegram
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared
│       ├── src
│       │   ├── api.ts
│       │   ├── errors.ts
│       │   └── status.ts
│       ├── package.json
│       └── tsconfig.json
├── docs
│   ├── phase-0-architecture.md
│   ├── backup-restore.md
│   ├── deployment.md
│   └── security.md
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── tsconfig.base.json
```

## Phasenabgrenzung

Phase 0 enthält bewusst noch keine vollständige App-Implementierung. Die nächsten Phasen bauen auf dieser Architektur auf:

1. Monorepo-Tooling und TypeScript-Basiskonfiguration
2. Drizzle-Schema und Migrationen
3. Credential-Verschlüsselung und Secret-Handling
4. Importer für Xtream Codes und M3U
5. Worker, FFmpeg-Runner und Incident-Logik
6. API und Dashboard
