# VHV Stream Monitor

VHV Stream Monitor ist eine deutschsprachige, vollständig selbst gehostete Webanwendung für technisches IPTV-Stream-Monitoring. Die Anwendung überwacht Sender aus Xtream-Codes-Providern oder M3U-Listen, speichert nur technische Prüfergebnisse und ist auf Datenschutz, minimale Angriffsfläche und kontrollierte Worker-Ausführung ausgelegt.

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

## Sicherheit

- Provider-Zugangsdaten werden mit AES-256-GCM verschlüsselt.
- Der Master-Key muss 32 Byte lang sein und als Base64 oder 64-stelliges Hex bereitgestellt werden.
- PostgreSQL bleibt im internen Compose-Netzwerk.
- Container verwenden `no-new-privileges` und droppen Capabilities.
- FFmpeg wird ohne Shell-Konkatenation gestartet.
- `.env`, `.env.*` und `secrets/` dürfen nicht eingecheckt werden.

Weitere Details stehen in `docs/security.md` und `docs/secrets.md`.

## Bekannte Einschränkungen

- Die Anwendung ist auf technisches Monitoring ausgelegt, nicht auf Wiedergabe oder Archivierung von IPTV-Inhalten.
- Worker-Parallelität ist absichtlich auf `1` begrenzt.
- Der Worker-Entrypoint validiert derzeit Laufzeitvoraussetzungen und stellt einen Healthcheck bereit; die Scheduler-Schleife aus `packages/monitoring` muss vor Produktivbetrieb noch in `apps/worker` verdrahtet werden.
- Provider-Import-Endpunkte und Importer sind noch nicht vollständig end-to-end verbunden; produktive Imports müssen vor Freigabe mit M3U- und Xtream-Testdaten validiert werden.
- Provider-Qualität, Rate Limits und Geoblocking können Prüfergebnisse beeinflussen.
- Telegram-Alerts sind optional und ersetzen kein vollständiges Incident-Management; die Runtime-Anbindung ist erst nach Worker-Integration produktiv belastbar.
- Ohne gültigen Master-Key können verschlüsselte Zugangsdaten nicht wiederhergestellt werden.
- Der finale Review-Bericht mit aktuellem DoD-Status steht in `docs/final-acceptance-report.md`.

## Weitere Dokumentation

- Architektur: [`docs/phase-0-architecture.md`](docs/phase-0-architecture.md)
- Deployment: [`docs/deployment.md`](docs/deployment.md)
- Secrets: [`docs/secrets.md`](docs/secrets.md)
- Sicherheit: [`docs/security.md`](docs/security.md)
