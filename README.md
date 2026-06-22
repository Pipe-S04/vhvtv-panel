# VHV Stream Monitor

VHV Stream Monitor ist eine deutschsprachige, vollständig selbst gehostete Webanwendung für technisches IPTV-Stream-Monitoring. Die Anwendung überwacht Sender aus Xtream-Codes-Providern oder M3U-Listen, speichert nur technische Prüfergebnisse und ist auf Datenschutz, minimale Angriffsfläche und kontrollierte Worker-Ausführung ausgelegt.

## Privacy-First-Zielbild

Das Projekt verfolgt ein technisches Reduktionsprinzip: **so wenig Daten wie möglich speichern**. Konkret bedeutet das im Code:

- Keine Speicherung von Video, Audio, Screenshots oder Rohpaketen.
- Keine Persistierung vollständiger Stream-URLs.
- Verschlüsselte Ablage von Provider-Zugangsdaten (AES-256-GCM).
- Redaction sensibler Werte in Logs und API-Fehlern.
- Keine externen Tracking-, Font- oder Telemetrie-Dienste.

Eine ausführliche Datenschutz- und Datenhaltungs-Analyse steht in [`PRIVACY.md`](PRIVACY.md). Dort sind auch offene Risiken/TODOs dokumentiert (u. a. fehlende App-Authentifizierung, Klartext-`base_url` bei M3U).

## Architekturüberblick

Monorepo mit getrennten Diensten (pnpm-Workspaces):

| Dienst    | Pfad                  | Aufgabe                                                          |
| --------- | --------------------- | --------------------------------------------------------------- |
| Web       | `apps/web`            | Next.js App Router Dashboard (deutschsprachig)                  |
| API       | `apps/api`            | Fastify-REST-API unter `/api/v1`                                |
| Worker    | `apps/worker`         | serieller Stream-Check-Worker mit FFmpeg (Concurrency `1`)      |
| Datenbank | `packages/database`   | PostgreSQL-Schema + Migrationen (Drizzle ORM)                   |
| Config    | `packages/config`     | AES-256-GCM-Krypto, Secret-Loader, Zod-Config-Validierung       |
| Shared    | `packages/shared`     | Redaction/Sanitization von Logs und Fehlern                     |
| Monitoring| `packages/monitoring` | Importer (Xtream/M3U), FFmpeg-Check, Telegram, SSRF-Guard       |
| UI        | `packages/ui`         | gemeinsame UI-Bausteine/Tokens                                  |

Betrieben werden die Dienste per Docker Compose: `postgres`, `api`, `worker`, `web`. PostgreSQL liegt im internen Netz (`backend: internal`) ohne Host-Port.

## Datenfluss (grob)

1. **Admin** legt einen Provider an (API). Benutzername/Passwort werden **verschlüsselt** gespeichert; `base_url` wird im Klartext abgelegt.
2. **Import** holt Kategorien/Sender vom Provider (über SSRF-gehärteten `safeFetch`) und speichert normalisierte Metadaten. Stream-URLs werden dabei **nicht** übernommen.
3. **Worker** wählt den nächsten fälligen Sender, entschlüsselt Credentials, erzeugt die Stream-URL **nur im Speicher** und prüft sie mit FFmpeg.
4. **Ergebnisse** (technische Messwerte, bereinigte Fehlertexte) werden gespeichert; Incidents und Aggregationen werden abgeleitet.
5. **Optional**: bei bestätigten Störungen/Recovery sendet der Worker eine **Telegram**-Nachricht (nur Sendername, Fehlercode, Kategorie, Zeit).
6. **Dashboard/API** liefern technische Daten aus – ohne Credentials, ohne `base_url`, ohne Stream-URLs.

## Funktionsumfang

- Self-hosted Betrieb mit Docker Compose.
- Web-Dashboard, API, Worker und PostgreSQL als getrennte Dienste.
- Provider-Import aus Xtream Codes und M3U-Playlisten.
- Technische Stream-Prüfung per Worker und FFmpeg mit globaler Parallelität `1`.
- Verschlüsselte Speicherung von Provider-Zugangsdaten mit AES-256-GCM.
- Keine Speicherung von Video, Audio, Screenshots oder Rohpaketen.
- PostgreSQL ohne öffentlichen Host-Port.
- Secrets per Docker Secrets beziehungsweise gemounteten Dateien.

## Voraussetzungen

Für lokale Entwicklung und Betrieb werden benötigt:

- Docker und Docker Compose Plugin.
- Node.js und pnpm gemäß `packageManager` in `package.json`, wenn außerhalb von Docker entwickelt wird.
- FFmpeg in der Worker-Laufzeit, sofern Stream-Prüfungen außerhalb der bereitgestellten Container ausgeführt werden.
- Zugriff auf einen Xtream-Codes-Provider oder eine M3U-Playlist, wenn echte Sender importiert werden sollen.

## Installation

1. Repository klonen und in das Projekt wechseln.
2. Umgebungsdatei und Secret-Dateien erstellen:

   ```bash
   cp .env.example .env
   mkdir -p secrets
   openssl rand -base64 32 > secrets/postgres_password.txt
   openssl rand -base64 32 > secrets/master_key.txt
   chmod 600 secrets/*.txt
   ```

3. Konfiguration prüfen:

   ```bash
   docker compose config
   ```

4. Stack starten:

   ```bash
   docker compose up --build
   ```

5. Weboberfläche öffnen: <http://127.0.0.1:3000>

Die Datei `.env` enthält nicht geheime Standardwerte und lokale Entwicklungswerte. Produktive Passwörter und der Master-Key gehören in `secrets/` und dürfen nicht in Git eingecheckt werden.

## ENV-Konfiguration

Quelle: `.env.example` und `packages/config/src/config.ts`. Secrets sollten in Produktion als Datei-Variante (`*_FILE`) / Docker-Secret bereitgestellt werden, **nicht** als Klartext in `.env`.

| Variable                       | Pflicht | Standard            | Bedeutung / Hinweis                                                    |
| ------------------------------ | ------- | ------------------- | --------------------------------------------------------------------- |
| `POSTGRES_DB`                  | ja      | `vhv_monitor`       | Datenbankname                                                         |
| `POSTGRES_USER`                | ja      | `vhv_monitor`       | Datenbankbenutzer                                                     |
| `POSTGRES_PASSWORD`            | ja*     | –                   | DB-Passwort; in Prod via `POSTGRES_PASSWORD_FILE`/Docker-Secret       |
| `DATABASE_HOST` / `DATABASE_PORT` | nein | `localhost`/`5432`  | DB-Verbindung                                                         |
| `API_BIND` / `PORT`            | nein    | `0.0.0.0`/`4000`    | API-Bindung                                                          |
| `WEB_BIND`                     | nein    | `127.0.0.1:3000`    | Host-Bindung des Web-Dienstes (Default nur lokal)                    |
| `API_PUBLIC_ORIGIN`            | ja      | –                   | öffentliche Origin (HTTPS) für CSRF/CORS                             |
| `NEXT_PUBLIC_API_BASE_URL`     | nein    | `/api/v1`           | API-Basis-URL im Frontend                                           |
| `LOG_LEVEL`                    | nein    | `info`              | pino-Loglevel                                                       |
| `WORKER_CONCURRENCY`           | nein    | `1`                 | **muss `1` sein** (im Schema erzwungen)                              |
| `WORKER_COOLDOWN_MS`           | nein    | `3000`              | Cooldown zwischen Checks                                            |
| `WORKER_POLL_INTERVAL_MS`      | nein    | `5000`              | Poll-Intervall des Workers                                          |
| `DEFAULT_CHECK_TIMEOUT_MS`     | nein    | `30000`             | Timeout je Stream-Check                                             |
| `ALLOW_PRIVATE_PROVIDER_HOSTS` | nein    | `false`             | SSRF-Guard; in Prod `false` lassen                                  |
| `MASTER_KEY`                   | ja*     | –                   | 32-Byte-AES-Key (base64 oder 64-Hex); in Prod via `MASTER_KEY_FILE` |
| `TELEGRAM_ALERTS_ENABLED`      | nein    | `false`             | Telegram-Alerts aktivieren                                         |
| `TELEGRAM_BOT_TOKEN`           | bedingt | –                   | nur wenn Alerts aktiv; Secret                                      |
| `TELEGRAM_CHAT_ID`             | bedingt | –                   | nur wenn Alerts aktiv                                              |
| `TELEGRAM_ALERT_COOLDOWN_MS`   | nein    | `1800000`           | Cooldown je Sender/Alarmtyp                                        |

\* In Produktion sollten `POSTGRES_PASSWORD` und `MASTER_KEY` über die `*_FILE`-Variante bereitgestellt werden. Es darf **nicht** gleichzeitig `NAME` und `NAME_FILE` für dasselbe Secret gesetzt sein – sonst bricht der Start kontrolliert ab.

## Datenbank / PostgreSQL

- Persistenz in PostgreSQL (Volume `postgres_data`), Schema und Migrationen via Drizzle in `packages/database`.
- Wesentliche Tabellen: `providers`, `categories`, `channels`, `channel_checks`, `incidents`, `hourly_channel_stats`, `daily_channel_stats`, `settings`, `audit_events`.
- Provider-Credentials liegen **verschlüsselt** (`username_encrypted`, `password_encrypted`); `base_url` liegt **im Klartext** (bei M3U ggf. mit Token – siehe Sicherheits-/Datenschutzhinweise).
- Vollständige Tabellen-/Sensibilitätsübersicht in [`PRIVACY.md`](PRIVACY.md), Abschnitt „PostgreSQL-Datenmodell".

## Lokale Entwicklung

Für Entwicklung mit pnpm:

```bash
pnpm install
pnpm dev
```

Nützliche Prüfungen:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Für eine Docker-nahe lokale Umgebung kann derselbe Compose-Stack wie in der Installation genutzt werden. `WEB_BIND` steuert, wo der Webdienst auf dem Host erreichbar ist. Der Standard `127.0.0.1:3000` bindet nur lokal.

## Produktionsbetrieb

Für Produktion gelten diese Mindestregeln:

- `WEB_BIND` bewusst setzen, zum Beispiel hinter einem Reverse Proxy.
- TLS am Reverse Proxy terminieren und `API_PUBLIC_ORIGIN` auf die öffentliche HTTPS-Origin setzen.
- `TELEGRAM_ALERTS_ENABLED` nur aktivieren, wenn Telegram-Zugangsdaten sicher bereitgestellt werden.
- Keine öffentlichen Ports für PostgreSQL veröffentlichen.
- `WORKER_CONCURRENCY=1` unverändert lassen; der Worker ist absichtlich seriell.
- Secrets ausschließlich als Docker Secrets oder gemountete Dateien bereitstellen.
- Backups regelmäßig testen und Restore-Prozesse dokumentieren.

Beispielhafter Start im Hintergrund:

```bash
docker compose up -d --build
```

Status prüfen:

```bash
docker compose ps
docker compose logs --tail=100 api worker web
```

## Xtream-Codes-Provider

Ein Xtream-Provider besteht typischerweise aus:

- Basis-URL des Providers.
- Benutzername.
- Passwort.
- Optionalen Import- oder Kategorieeinstellungen.

Die Anwendung speichert Zugangsdaten verschlüsselt und darf vollständige Stream-URLs nicht an das Frontend ausliefern. Beim Import werden Kategorien und Sender normalisiert. Der Worker erzeugt die benötigte Stream-URL nur intern für den einzelnen technischen Check.

Hinweise:

- Zugangsdaten nur über die Provider-Verwaltung erfassen.
- Provider-URL ohne eingebettete Zugangsdaten bevorzugen.
- Nach Passwortwechsel beim Provider die gespeicherten Zugangsdaten aktualisieren und einen neuen Import anstoßen.

## M3U-Provider

Ein M3U-Provider verweist auf eine Playlist-Datei oder URL. Beim Import werden verfügbare Metadaten wie Sendername, Kategorie und technische Stream-Adresse normalisiert.

Hinweise:

- M3U-URLs können Zugangsdaten oder Tokens enthalten und müssen wie Secrets behandelt werden.
- Playlist-Inhalte werden nicht als Rohdatei zur späteren Wiedergabe gespeichert.
- Sender ohne verwertbare Stream-Adresse oder Namen können beim Import übersprungen oder als fehlerhaft markiert werden.

## Monitoring und Senderauswahl

Der Worker wählt immer den nächsten fälligen Sender aus der Datenbank aus. Die Auswahl erfolgt transaktional, damit parallel gestartete Prozesse nicht denselben Sender prüfen. Trotzdem bleibt die konfigurierte Worker-Parallelität exakt `1`.

Ablauf:

1. Nächsten fälligen Sender reservieren.
2. Provider-Zugangsdaten im Worker entschlüsseln.
3. Stream-URL nur im Speicher erzeugen.
4. FFmpeg mit Argument-Array starten, nicht über Shell-String-Konkatenation.
5. Technische Messwerte und normalisierte Fehler speichern.
6. Incident-Status aktualisieren.
7. Optionalen Alarm cooldown-geschützt versenden.
8. `next_check_at` neu berechnen und Cooldown einhalten.

Wichtige Parameter aus `.env.example`:

- `WORKER_CONCURRENCY=1`
- `WORKER_COOLDOWN_MS=3000`
- `WORKER_POLL_INTERVAL_MS=5000`
- `DEFAULT_CHECK_TIMEOUT_MS=30000`

## Backup

Mindestens PostgreSQL-Daten und Secret-Dateien sichern:

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backups/vhv_monitor.sql
cp -a secrets backups/secrets
```

Empfehlungen:

- Backups verschlüsselt und getrennt vom Host speichern.
- Zugriff auf `master_key.txt` stark beschränken; ohne Master-Key können verschlüsselte Providerdaten nicht entschlüsselt werden.
- Backup-Zeitpunkt, App-Version beziehungsweise Git-Commit und Compose-Konfiguration dokumentieren.

## Restore

1. Stack stoppen:

   ```bash
   docker compose down
   ```

2. Secrets aus dem Backup zurücklegen:

   ```bash
   mkdir -p secrets
   cp -a backups/secrets/. secrets/
   chmod 600 secrets/*.txt
   ```

3. Datenbankvolume neu erstellen oder leere Datenbank bereitstellen.
4. PostgreSQL starten und Dump einspielen:

   ```bash
   docker compose up -d postgres
   docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backups/vhv_monitor.sql
   ```

5. Gesamten Stack starten:

   ```bash
   docker compose up -d --build
   ```

6. Weboberfläche, API-Healthcheck, Worker-Logs und einige Senderdetails prüfen.

## Updates

Empfohlener Update-Ablauf:

```bash
git pull
pnpm install --frozen-lockfile
pnpm test
docker compose build
docker compose up -d
```

Vor produktiven Updates immer ein Backup erstellen. Bei Änderungen am Datenbankschema müssen Migrationen vor oder während des Deployments kontrolliert ausgeführt werden. Nach dem Update Logs und Healthchecks prüfen.

## Troubleshooting

### Weboberfläche nicht erreichbar

- `docker compose ps` prüfen.
- `WEB_BIND` kontrollieren.
- Logs des Webdienstes ansehen: `docker compose logs --tail=100 web`.
- Reverse-Proxy-Konfiguration und TLS prüfen.

### API-Fehler oder leere Daten

- API-Logs prüfen: `docker compose logs --tail=100 api`.
- Datenbank-Healthcheck prüfen: `docker compose ps postgres`.
- Secret-Dateien und Dateirechte prüfen.
- Sicherstellen, dass nicht gleichzeitig `NAME` und `NAME_FILE` für dasselbe Secret gesetzt sind.

### Worker prüft keine Sender

- Worker-Logs prüfen: `docker compose logs --tail=100 worker`.
- `WORKER_CONCURRENCY` muss `1` sein.
- Provider-Import und fällige Sender prüfen.
- Timeout- und Cooldown-Werte kontrollieren.

### Import schlägt fehl

- Provider-URL, Zugangsdaten und Netzwerkzugriff prüfen.
- Bei M3U: Playlist-Format und erreichbare Stream-URLs kontrollieren.
- Bei Xtream: Basis-URL, Benutzername und Passwort prüfen.
- Keine vollständigen URLs oder Zugangsdaten in Tickets, Logs oder Screenshots teilen.

## Datenschutz

- Keine externen Tracking-, Font- oder Telemetrie-Dienste.
- Keine Speicherung von Video, Audio, Screenshots oder Rohpaketen.
- Keine Ausgabe vollständiger Stream-URLs an das Frontend.
- API-Antworten enthalten keine Provider-Passwörter, verschlüsselten Credentials oder FFmpeg-Rohlogs.
- Logs werden redigiert, bevor sensitive Werte geschrieben werden.
- Es werden **keine Endkunden- oder KYC-Daten** verarbeitet; die einzigen personennahen Daten sind die vom Betreiber selbst eingegebenen Provider-Zugangsdaten.

Die vollständige Datenschutz- und Datenhaltungs-Analyse inkl. Tabellenübersicht, Retention, externen Datenflüssen und offenen Risiken steht in **[`PRIVACY.md`](PRIVACY.md)**.

## Sicherheit

- Provider-Zugangsdaten werden mit AES-256-GCM verschlüsselt.
- Der Master-Key muss 32 Byte lang sein und als Base64 oder 64-stelliges Hex bereitgestellt werden.
- PostgreSQL bleibt im internen Compose-Netzwerk.
- Container verwenden `no-new-privileges` und droppen Capabilities.
- FFmpeg wird ohne Shell-Konkatenation gestartet.
- Ausgehende Provider-Requests laufen über einen SSRF-gehärteten `safeFetch`-Guard.
- `.env`, `.env.*` und `secrets/` dürfen nicht eingecheckt werden.

**Wichtiger Hinweis zum Zugriffsschutz:** Die API und das Web-Dashboard enthalten **keine eigene Authentifizierung** (kein Login, keine Rollen). Der „Admin-only"-Charakter ergibt sich allein aus dem Deployment (lokale Bindung, internes DB-Netz, Reverse Proxy). **Vor jeder Exposition ist eine vorgelagerte Zugriffskontrolle (z. B. Reverse-Proxy-Auth, SSO oder IP-Allowlist) zwingend.** Details und weitere Risiken siehe [`PRIVACY.md`](PRIVACY.md), Abschnitt „Risiken und empfohlene Maßnahmen".

Weitere Details stehen in `docs/security.md` und `docs/secrets.md`.

## Backup, Retention und Wartung

- Bevorzugt das verschlüsselnde Skript `scripts/backup-postgres.sh` nutzen (age/gpg; verweigert unverschlüsselte Dumps). Restore über `scripts/restore-postgres.sh`.
- Backups enthalten verschlüsselte Credentials **und** die Klartext-`base_url` – also potenziell sensibel; verschlüsselt und getrennt lagern.
- Den `master_key` separat sichern: Ohne ihn sind verschlüsselte Credentials unwiederbringlich.
- Aufbewahrungsfristen sind in `packages/database/src/retention.ts` definiert (Rohmessungen 90 Tage, aufgelöste Incidents 30 Tage, stündliche/tägliche Aggregationen 365/730 Tage, Audit-Events 365 Tage). **Hinweis:** Ein automatischer Retention-Lauf ist im Anwendungscode derzeit nicht verdrahtet und im Betrieb zu prüfen (siehe [`PRIVACY.md`](PRIVACY.md)).

## Bekannte Einschränkungen

- Die Anwendung ist auf technisches Monitoring ausgelegt, nicht auf Wiedergabe oder Archivierung von IPTV-Inhalten.
- Worker-Parallelität ist absichtlich auf `1` begrenzt.
- Der Worker-Entrypoint validiert derzeit Laufzeitvoraussetzungen und stellt einen Healthcheck bereit; die Scheduler-Schleife aus `packages/monitoring` muss vor Produktivbetrieb noch in `apps/worker` verdrahtet werden.
- Provider-Import-Endpunkte und Importer sind noch nicht vollständig end-to-end verbunden; produktive Imports müssen vor Freigabe mit M3U- und Xtream-Testdaten validiert werden.
- Provider-Qualität, Rate Limits und Geoblocking können Prüfergebnisse beeinflussen.
- Telegram-Alerts sind optional und ersetzen kein vollständiges Incident-Management; die Runtime-Anbindung ist erst nach Worker-Integration produktiv belastbar.
- Ohne gültigen Master-Key können verschlüsselte Zugangsdaten nicht wiederhergestellt werden.
- Der finale Review-Bericht mit aktuellem DoD-Status steht in `docs/final-acceptance-report.md`.

### Offene Datenschutz-/Sicherheits-TODOs

- **Keine App-Authentifizierung:** Zugriffskontrolle muss vorgelagert ergänzt werden (siehe Sicherheit).
- **`base_url` im Klartext:** Bei M3U potenziell mit eingebettetem Token – als Secret behandeln; mögliche Verschlüsselung ist ein offenes Code-TODO.
- **Retention nicht verdrahtet:** `runRetentionCleanup` ist implementiert, aber ohne automatischen Aufruf.
- **`audit_events` ohne Schreibpfad:** Tabelle/Retention vorhanden, Audit-Logging noch nicht implementiert.

Diese Punkte sind in [`PRIVACY.md`](PRIVACY.md) ausführlicher dokumentiert.

## Weitere Dokumentation

- Architektur: [`docs/phase-0-architecture.md`](docs/phase-0-architecture.md)
- Deployment: [`docs/deployment.md`](docs/deployment.md)
- Secrets: [`docs/secrets.md`](docs/secrets.md)
- Sicherheit: [`docs/security.md`](docs/security.md)
