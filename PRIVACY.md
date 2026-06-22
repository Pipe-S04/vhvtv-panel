# Datenschutz- und Datenhaltungs-Dokumentation – VHV Stream Monitor

> Status: technische Bestandsaufnahme auf Basis des Repository-Codes (Stand: Branch-Analyse).
> Diese Datei ist **kein Rechtsgutachten** und keine DSGVO-Konformitätszusage. Sie beschreibt,
> **welche Daten** die Anwendung verarbeitet, **wo** und **warum** sie gespeichert werden und
> welche **Risiken / Schutzmaßnahmen** im Code erkennbar sind. Aussagen, die aus dem Code nicht
> eindeutig hervorgehen, sind als „nicht im Repository ersichtlich" oder „zu prüfen" markiert.

---

## 1. Überblick

VHV Stream Monitor ist eine selbst gehostete Webanwendung für **technisches IPTV-Stream-Monitoring**.
Die Anwendung importiert Sender aus **Xtream-Codes-Providern** oder **M3U-Playlisten**, prüft sie
periodisch per Worker und FFmpeg und speichert ausschließlich **technische Prüfergebnisse**
(Verfügbarkeit, Startzeiten, Bitrate, Fehlercodes).

Die Anwendung ist als Monorepo aufgebaut:

| Dienst   | Paket/App            | Funktion                                                        |
| -------- | -------------------- | --------------------------------------------------------------- |
| API      | `apps/api`           | Fastify-REST-API (`/api/v1`)                                     |
| Web      | `apps/web`           | Next.js-Dashboard (deutschsprachig)                             |
| Worker   | `apps/worker`        | serieller Stream-Check-Worker (FFmpeg), Concurrency exakt `1`   |
| Datenbank| `packages/database`  | PostgreSQL-Schema (Drizzle ORM)                                 |
| Crypto   | `packages/config`    | AES-256-GCM-Verschlüsselung, Secret-Loader, Config-Validierung  |
| Redaction| `packages/shared`    | Redaction/Sanitization von Logs und Fehlern                     |
| Monitoring| `packages/monitoring`| Importer, FFmpeg-Check, Telegram-Benachrichtigung, SSRF-Guard  |

> Hinweis: Die Datenbank ist **PostgreSQL**, nicht SQLite. Die folgende Tabellenübersicht bezieht
> sich auf das tatsächliche Drizzle-Schema in `packages/database/src/schema.ts`.

---

## 2. Privacy-First-Grundsatz

Die im Code erkennbaren Privacy-orientierten Designentscheidungen:

- **Keine Speicherung von Medieninhalten:** Es werden keine Videos, Audiodaten, Screenshots oder
  Rohpakete gespeichert. FFmpeg schreibt die Ausgabe nach `-f null -` (verworfen).
- **Datenminimierung bei Prüfungen:** Gespeichert werden nur technische Messwerte und ein
  **normalisierter, gefilterter** Fehlertext (`sanitized_error_message`), keine Roh-Logs.
- **Verschlüsselung von Zugangsdaten:** Provider-Benutzername/-Passwort werden mit AES-256-GCM
  verschlüsselt abgelegt (`packages/config/src/crypto.ts`).
- **Redaction in Logs und API-Fehlern:** URLs, Credential-haltige Query-Parameter, Auth-/Cookie-Header
  und sensible Objekt-Keys werden vor dem Logging bzw. vor der Auslieferung entfernt
  (`packages/shared/src/redaction.ts`).
- **Keine vollständigen Stream-URLs im Frontend:** API-DTOs liefern weder `baseUrl`, noch Credentials,
  noch Stream-URLs aus.
- **Keine externen Tracking-/Telemetrie-/Font-Dienste** im Code erkennbar.
- **Reduzierte Angriffsfläche:** PostgreSQL ohne Host-Port, gehärtete Container, SSRF-Guard.

> „Privacy-First" ist hier als **technisches Reduktionsprinzip** zu verstehen („speichert so wenig
> wie möglich"), nicht als juristische Konformitätsaussage.

---

## 3. Welche Daten werden verarbeitet?

| Datenkategorie                 | Quelle                       | Verarbeitung                                              |
| ------------------------------ | ---------------------------- | -------------------------------------------------------- |
| Provider-Stammdaten            | Admin-Eingabe (API)          | Name, Typ (`xtream`/`m3u`), `base_url`                   |
| Provider-Zugangsdaten          | Admin-Eingabe (API)          | Benutzername/Passwort → **verschlüsselt** gespeichert    |
| Kategorien                     | Provider-Import              | Externe ID + Name                                        |
| Sender (Channels)              | Provider-Import              | Name, normalisierter Name, externe Stream-ID, Logo-Pfad  |
| Technische Stream-URL          | nur Laufzeit (Worker)        | **nur im Speicher**, nicht persistiert                   |
| Prüfergebnisse (Checks)        | Worker/FFmpeg                | Mess-/Timing-Werte, Codec, Fehlercode, sanitized message |
| Incidents                      | abgeleitet aus Checks        | Start/Ende, Fehlercode, Zähler                           |
| Aggregierte Statistiken        | Aggregation                  | stündlich/täglich (Verfügbarkeit, Startzeit, Bitrate)    |
| Einstellungen (Settings)       | Admin-Eingabe                | Key/JSON-Value (sensible Werte werden bei Ausgabe redigiert) |
| Telegram-Benachrichtigungen    | Worker → Telegram API        | Sendername, Fehlercode, Kategorie, Zeit                  |
| Logs                           | API/Worker (pino)            | technische Logs, **redigiert**                           |

**Es gibt keine Endkunden-, Nutzerkonten- oder Login-Daten** (siehe Abschnitt 8 und 12).

---

## 4. Welche Daten werden dauerhaft gespeichert?

Dauerhaft (in PostgreSQL, Volume `postgres_data`) gespeichert:

- **Provider:** Name, Typ, `base_url` (Klartext), verschlüsselter Benutzername/Passwort, Flags, Timestamps.
- **Kategorien:** externe ID, Name.
- **Sender:** Name, normalisierter Name, externe Stream-ID, Logo-Pfad, Monitoring-Konfiguration,
  aktueller Status, Fehler-/Erfolgszähler, Timestamps.
- **Channel-Checks:** technische Messwerte je Prüfung (siehe Abschnitt 7).
- **Incidents:** Störungs-Lebenszyklus (offen/aufgelöst), Fehlercode, Zähler.
- **Stündliche/tägliche Aggregationen.**
- **Settings:** Key/JSON.
- **Audit-Events-Tabelle:** existiert im Schema (siehe Abschnitt 11 – aktuell ohne Schreibpfad).

Außerhalb der Datenbank:

- **Secrets** (`MASTER_KEY`, `POSTGRES_PASSWORD`, optional Telegram-Token/Chat-ID) als gemountete
  Dateien / Docker Secrets bzw. Umgebungsvariablen – **nicht** in der Datenbank.

---

## 5. Welche Daten werden bewusst nicht gespeichert?

| Nicht gespeichert                                  | Beleg im Code                                                    |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Video-/Audiodaten, Screenshots, Rohpakete          | `ffmpeg.ts` nutzt `-f null -`, keine Speicherung                |
| Vollständige technische Stream-URL                 | Importer setzen `streamUrl: null`; keine `stream_url`-Spalte    |
| Roh-FFmpeg-Logs                                    | nur `sanitized_error_message` wird gespeichert                  |
| Provider-Passwort/Benutzername im Klartext         | nur verschlüsselt (`password_encrypted`, `username_encrypted`)  |
| Credentials in API-Antworten                       | `toProviderDto` liefert nur `hasCredentials: boolean`           |
| `base_url`, Stream-ID, Logo-Pfad im Channel-DTO    | `ChannelDto` `Omit`-Typ entfernt `externalStreamId`, `logoPath` |
| Endkunden-/Account-/Login-Daten                    | keine Auth-/User-Tabellen vorhanden                             |
| Remote-Logo-URLs                                    | `localLogoPath()` akzeptiert nur lokale Pfade                   |

---

## 6. Wo werden Daten gespeichert?

| Speicherort                        | Inhalt                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| PostgreSQL (`postgres_data`-Volume)| sämtliche Anwendungsdaten (siehe Abschnitt 7)                 |
| `./secrets/*.txt` → `/run/secrets/*` | `master_key`, `postgres_password` (Docker Secrets / Dateien) |
| Umgebungsvariablen / `.env`        | nicht geheime Config + lokale Dev-Werte; Telegram-Token optional |
| Container-`tmpfs` (`/tmp`, `/run`) | flüchtig, nicht persistent                                    |
| Log-Ausgabe (stdout der Container) | redigierte technische Logs                                    |
| Backups (`backups/`, extern)       | verschlüsselte `pg_dump`-Dumps (siehe Abschnitt 13)           |

PostgreSQL läuft im internen Compose-Netzwerk (`backend: internal: true`) **ohne veröffentlichten
Host-Port**.

---

## 7. PostgreSQL-Datenmodell / Tabellenübersicht

Quelle: `packages/database/src/schema.ts`.

### `providers`
| Spalte                | Sensibilität | Hinweis                                            |
| --------------------- | ------------ | -------------------------------------------------- |
| `id` (uuid)           | niedrig      | Primärschlüssel                                    |
| `name`                | niedrig      | Anzeigename                                        |
| `type`                | niedrig      | `xtream` / `m3u`                                   |
| `base_url`            | **erhöht**   | **Klartext** – bei M3U potenziell Token/Credential in der URL |
| `username_encrypted`  | hoch         | AES-256-GCM (serialisiertes Payload)               |
| `password_encrypted`  | hoch         | AES-256-GCM                                        |
| `encryption_nonce`/`_tag` | hoch     | Legacy-Felder; aktuelles Payload trägt iv/tag inline |
| `enabled`, Timestamps | niedrig      |                                                    |

### `categories`
`id`, `provider_id`, `external_id`, `name`, Timestamps — niedrige Sensibilität.

### `channels`
`id`, `provider_id`, `category_id`, `external_stream_id`, `name`, `normalized_name`, `logo_path`,
Monitoring-Konfiguration (`monitor_enabled`, `priority`, Intervalle), Statusfelder
(`current_status`, `consecutive_failures/successes`, `next/last_check_at`), Timestamps.
→ **keine** Spalte für die vollständige Stream-URL.

### `channel_checks` (Rohmessungen)
Technische Werte je Prüfung: `status`, `connection_ms`, `first_byte_ms`, `first_video/audio_frame_ms`,
`total_startup_ms`, `check_duration_ms`, `received_bytes`, `average_bitrate_kbps`, `video/audio_codec`,
`width`, `height`, `fps`, `audio/video_detected`, `decoder_errors`, `freeze/black_duration_ms`,
`http_status`, `error_code` (Enum), `sanitized_error_message`. → keine personenbezogenen Daten.

### `incidents`
`channel_id`, `started_at`, `resolved_at`, `status`, `error_code`, `failed_checks`,
`successful_recovery_checks`.

### `hourly_channel_stats` / `daily_channel_stats`
Aggregierte Verfügbarkeit, Startzeiten, Bitrate, Incident-Anzahl.

### `settings`
`key` (text), `value` (jsonb), `updated_at`. Bei Ausgabe wird `value` über `redactValueForKey()`
gefiltert, wenn der Key als sensibel erkannt wird.

### `audit_events`
`id`, `action`, `entity_type`, `entity_id`, `created_at`.
**Befund:** Tabelle und Retention-Logik sind vorhanden, ein **Schreibpfad ist im Code nicht
auffindbar** (kein `insert` in `audit_events`). → siehe Abschnitt 11 (Risiko/TODO).

---

## 8. KYC-/Kundendaten-Bewertung

**Befund: Die Anwendung verarbeitet keine Endkunden- und keine KYC-relevanten Daten.**

- Es gibt **keine** Endkunden-, Abonnenten- oder Nutzerkonten, keine Namen, Adressen, Zahlungs- oder
  Identitätsdaten.
- Die einzigen „personennahen" Daten sind **Provider-Zugangsdaten** (Benutzername/Passwort des
  IPTV-Providers), die der **Betreiber selbst** eingibt. Diese sind betriebliche Zugangsgeheimnisse,
  keine KYC-Daten von Endkunden.
- Sender- und Kategorienamen sind Metadaten von Medienangeboten, nicht von natürlichen Personen.

**Schlussfolgerung:** Aus technischer Sicht ist die Anwendung **nicht KYC-relevant**. Ob der
**Betrieb** (z. B. wer Zugriff auf das Dashboard hat, vertragliche Provider-Beziehungen) rechtliche
Pflichten auslöst, ist **außerhalb des Codes** und hier nicht bewertbar → **zu prüfen** durch den
Betreiber.

---

## 9. Umgang mit Passwörtern, M3U-URLs und sensiblen API-Daten

### Provider-Passwörter / Benutzernamen
- Werden bei Anlage/Update mit **AES-256-GCM** verschlüsselt (`encryptSecretField`), inkl.
  **Additional Authenticated Data** (`provider:<id>:<field>`), die Ciphertext an Datensatz und Feld
  bindet (Schutz gegen Field-Swapping).
- Frischer 96-bit-Nonce je Verschlüsselung; versioniertes, selbsttragendes Payload.
- API liefert **niemals** die Credentials zurück, nur `hasCredentials: boolean`.

### M3U-URLs / `base_url`
- **Wichtiger Befund:** `base_url` wird **im Klartext** gespeichert. Bei **M3U-Providern** ist die
  `base_url` die Playlist-URL und kann eingebettete Tokens/Zugangsdaten enthalten
  (`https://host/get.php?username=…&password=…`).
  → Damit liegt potenziell ein Zugangsgeheimnis im Klartext in der DB und in Backups.
  → Empfehlung/TODO (Abschnitt 14). **Keine Code-Änderung im Rahmen dieser Dokumentation.**
- `base_url` wird jedoch **nicht** an das Frontend ausgeliefert (nicht Teil von `ProviderDto`) und
  in Logs/Fehlern redigiert.

### Technische Stream-URLs
- Werden **nicht gespeichert**: Importer setzen `streamUrl: null`, das Channel-Schema hat keine
  entsprechende Spalte. Der Worker erzeugt die Stream-URL nur **im Speicher** für den einzelnen Check.

### Sensible Daten in API-Antworten
- `ProviderDto`: ohne `base_url`, ohne Credentials.
- `ChannelDto`: ohne `external_stream_id`, ohne `logo_path` (per `Omit`-Typ).
- `SettingDto`: `value` wird über `redactValueForKey()` gefiltert.
- `CheckDto`: enthält nur `sanitized_error_message`, keine Roh-Logs.

### Werden sensible Daten aus Statusabfragen entfernt/gefiltert?
**Ja** – auf zwei Ebenen: (1) DTO-Mapper geben sensible Felder gar nicht erst aus,
(2) Logging/Fehler-Pfad redigiert verbleibende Treffer per Pattern (`redactString`, `pinoRedactionPaths`).

---

## 10. Logging & Fehlerbehandlung

- **Strukturierte Logs** über pino mit `redact`-Pfaden (`pinoRedactionPaths`): Authorization-/Cookie-/
  CSRF-Header, `*.password/token/secret/masterKey/username/baseUrl/streamUrl/credentials/ciphertext`,
  sowie `err.message`/`err.stack`/`err.cause.*`.
- **`redactString()`** entfernt aus freien Texten: Credential-URLs (`user:pass@`), URLs gesamt,
  Credential-Query-Parameter und Auth-/Cookie-Header.
- **Roh-Fehlermeldungen an Telegram?** **Nein.** Telegram-Nachrichten enthalten nur Sendername,
  `error_code` (Enum), optional Kategorie und Uhrzeit – **keine** freien Fehlertexte, URLs oder
  Credentials (`formatTelegramMessage`).
- **Roh-Fehler an HTTP-Clients?** Der `error-handler` redigiert Messages; im Produktionsmodus
  (`NODE_ENV=production`) werden interne 5xx-Fehler auf `"An internal error occurred."` reduziert.
- **FFmpeg-stderr** wird vor Speicherung über `sanitizeError()` gefiltert und auf 64 KB begrenzt;
  gespeichert wird nur die bereinigte Nachricht.

> Hinweis: Redaction ist Pattern-basiert (Defense-in-Depth), keine Garantie. Ungewöhnlich kodierte
> Geheimnisse können theoretisch durchrutschen → siehe Abschnitt 14.

---

## 11. Reports, Events und Retention

### Welche Events werden gespeichert?
- **`channel_checks`** – jede technische Prüfung (Rohmessung).
- **`incidents`** – Störungen (offen/aufgelöst), abgeleitet aus aufeinanderfolgenden Fehlern.
- **`hourly_channel_stats` / `daily_channel_stats`** – Aggregationen.
- **`audit_events`** – im Schema vorhanden, **derzeit ohne Schreibpfad** (kein `insert` im Code).

### Aufbewahrung (Retention) – `packages/database/src/retention.ts`
| Daten                         | Aufbewahrung | Funktion                              |
| ----------------------------- | ------------ | ------------------------------------- |
| Rohmessungen (`channel_checks`)| 90 Tage     | `deleteRawMeasurementsOlderThan`      |
| aufgelöste Incidents          | 30 Tage      | `deleteResolvedIncidentsOlderThan`    |
| stündliche Aggregationen      | 365 Tage     | `deleteHourlyAggregationsOlderThan`   |
| tägliche Aggregationen        | 730 Tage     | `deleteDailyAggregationsOlderThan`    |
| Audit-Events                  | 365 Tage     | `deleteAuditEventsOlderThan`          |

**Befund:** `runRetentionCleanup()` ist implementiert und getestet, ein **automatischer Aufruf
(Scheduler/Cron) ist im Anwendungscode nicht auffindbar**. Ob Retention im Betrieb tatsächlich läuft,
ist **zu prüfen / zu verdrahten** (vgl. README: Worker-Scheduler noch nicht produktiv verdrahtet).

---

## 12. Backup- und Restore-Hinweise

- **`scripts/backup-postgres.sh`** erzeugt `pg_dump -Fc` und **verschlüsselt verpflichtend** mit
  `age` (Recipient) oder `gpg` (AES256, Passphrase-Datei); ohne Schlüssel **verweigert** das Skript
  und löscht den Klartext-Dump per `shred`. Lokale Backup-Retention: `BACKUP_RETENTION_DAYS` (Default 30).
- **`scripts/restore-postgres.sh`** – Gegenstück zum Restore (siehe README).
- **Wichtig:** Ein DB-Backup enthält **verschlüsselte Provider-Credentials** (nur mit `master_key`
  entschlüsselbar) **und** die **Klartext-`base_url`** – bei M3U also potenziell eingebettete Tokens.
  → Backups sind damit **sensibel** und müssen verschlüsselt und getrennt gelagert werden.
- Der **`master_key`** ist separat und streng zu schützen: ohne ihn sind die verschlüsselten
  Credentials unwiederbringlich; mit ihm + Backup sind sie wiederherstellbar.

> Hinweis: Der manuelle `pg_dump`-Befehl im README erzeugt einen **unverschlüsselten** Dump. Für den
> Produktivbetrieb ist das verschlüsselnde `scripts/backup-postgres.sh` vorzuziehen.

---

## 13. Zugriffsschutz / Admin-only-Prinzip

**Befund: Die API und das Web-Dashboard besitzen keine eigene Authentifizierung/Autorisierung.**
Im Code finden sich CSRF-Schutz, Rate-Limiting, Security-Header und CORS, aber **kein Login, keine
Benutzerkonten, keine Rollen, kein Token-/Session-Mechanismus**.

Der „Admin-only"-Charakter ergibt sich ausschließlich aus dem **Deployment**:

- `WEB_BIND` bindet standardmäßig nur lokal (`127.0.0.1:3000`).
- PostgreSQL ist nicht nach außen veröffentlicht (internes Compose-Netz).
- Vorgesehen ist Betrieb **hinter einem Reverse Proxy** mit TLS – und implizit dort zu ergänzender
  Zugriffskontrolle (z. B. Basic-Auth/SSO/IP-Allowlist).

→ **Wer Netzwerkzugriff auf die Web/API-Origin hat, hat vollen Zugriff** (inkl. Provider anlegen,
Imports/Tests auslösen). Eine Authentifizierungsschicht ist **vor Exposition zwingend** und im Code
**nicht** enthalten → siehe Abschnitt 14. **„Admin-only" ist hier eine Betriebsannahme, keine im Code
erzwungene Eigenschaft.**

---

## 14. Externe Dienste und Datenflüsse

### Telegram Bot API
- Optional (`TELEGRAM_ALERTS_ENABLED`), benötigt `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (Secrets).
- Ausgehender Aufruf an `https://api.telegram.org/bot<token>/sendMessage` mit
  `disable_web_page_preview: true`.
- Übertragene Inhalte: Sendername, `error_code`, optional Kategorie, Uhrzeit (Europe/Berlin).
- **Datenfluss zu Dritten:** Telegram (Anbieter Telegram FZ-LLC) erhält diese Metadaten. Aktivierung
  bedeutet Datenweitergabe an einen externen Dienst → bewusst zu entscheiden.

### Panel-/Provider-API (Xtream / M3U)
- Ausgehende Importe/Connectivity-Tests gehen über den **SSRF-gehärteten `safeFetch`**:
  Protokoll-Allowlist (`http/https`), Blockade von Loopback/Link-Local/Privat/CGNAT/Metadaten
  (inkl. `169.254.169.254`), Redirect-Revalidierung pro Hop, harte Timeouts, Größenlimit.
- Default blockt interne Ziele; `ALLOW_PRIVATE_PROVIDER_HOSTS=true` nur für vertrauenswürdige,
  isolierte interne Provider.
- An den Provider gesendet werden dessen eigene Zugangsdaten (Xtream: `username`/`password` als
  Query-Parameter im `player_api.php`-Aufruf – Provider-Vorgabe).
- **Antworten** des Providers (Kategorien/Streams) werden normalisiert; Stream-URLs werden **nicht**
  übernommen/gespeichert. Provider-Antworten könnten theoretisch weitere Felder enthalten, die jedoch
  beim Normalisieren verworfen werden (nur definierte Felder werden übernommen).

### Hosting-/Docker-Umgebung
- Container laufen non-root (`10001:10001`), `read_only`, `cap_drop: ALL`, `no-new-privileges`,
  `pids_limit`, `tmpfs` für flüchtige Pfade.
- PostgreSQL nur im internen Netz, Secrets via Docker Secrets.
- Hosting-Provider/Infra-Logs sind **nicht im Repository ersichtlich** → betrieblich zu prüfen.

---

## 15. Risiken und empfohlene Maßnahmen

> Alle Punkte sind **Empfehlungen/TODOs**. Im Rahmen dieser Dokumentation wurde **kein Code geändert**.

| # | Risiko / Beobachtung | Bewertung | Empfehlung |
| - | -------------------- | --------- | ---------- |
| R1 | **Keine Authentifizierung** auf API/Web | hoch (bei Exposition) | Auth-Schicht (Reverse-Proxy-Auth/SSO/Basic-Auth/IP-Allowlist) **vor** jeder Exposition erzwingen; nie ohne Zugriffsschutz veröffentlichen. |
| R2 | **`base_url` im Klartext**, bei M3U potenziell mit eingebettetem Token | mittel–hoch | M3U-URLs als Secret behandeln; ggf. tokenisierte URLs verschlüsseln oder Credential-Teil separieren (Code-TODO, nicht hier umgesetzt). |
| R3 | **Retention nicht verdrahtet** (`runRetentionCleanup` ohne Scheduler-Aufruf gefunden) | mittel | Periodischen Aufruf (Worker-Scheduler/Cron) ergänzen und im Betrieb verifizieren. |
| R4 | **`audit_events` ohne Schreibpfad** | niedrig–mittel | Entweder Audit-Logging implementieren oder Tabelle/Retention als „reserviert" dokumentieren. |
| R5 | **Telegram-Token in `.env`** möglich | mittel | Token via Datei/Docker-Secret bereitstellen, nicht in `.env`/Shell-History; `.env` nie committen. |
| R6 | **Backups enthalten sensible Daten** (verschl. Credentials + Klartext-`base_url`) | mittel | Nur verschlüsseltes `backup-postgres.sh` nutzen; getrennt & zugriffsbeschränkt lagern; `master_key` separat sichern. |
| R7 | **Pattern-basierte Redaction** ist nicht lückenlos | niedrig–mittel | Als Defense-in-Depth verstehen; Log-Sinks zusätzlich absichern; keine Geheimnisse in freie Strings schreiben. |
| R8 | **DNS-Rebinding (TOCTOU)** im SSRF-Guard (dokumentiert) | niedrig | Interne Hosts zusätzlich auf Netzwerkebene blocken; `ALLOW_PRIVATE_PROVIDER_HOSTS=false` lassen. |
| R9 | **Master-Key-Verlust** = Credentials unwiederbringlich | betrieblich | Key sicher hinterlegen/escrow; Verlust-/Rotationsprozess dokumentieren (Rotation im Code nicht ersichtlich). |

---

## 16. Produktions-Checkliste (Datenschutz/Sicherheit)

- [ ] Zugriffsschutz **vor** Web/API aktiv (Reverse Proxy + Auth/SSO/IP-Allowlist) — **kritisch (R1)**.
- [ ] `WEB_BIND` bewusst gesetzt, PostgreSQL ohne Host-Port.
- [ ] TLS am Reverse Proxy, `API_PUBLIC_ORIGIN` auf öffentliche HTTPS-Origin.
- [ ] `MASTER_KEY` und `POSTGRES_PASSWORD` als Docker-Secret/Datei, nicht in `.env`.
- [ ] `.env`, `.env.*`, `secrets/` **nicht** in Git.
- [ ] `WORKER_CONCURRENCY=1` unverändert.
- [ ] `ALLOW_PRIVATE_PROVIDER_HOSTS=false` (außer bewusst isoliert intern).
- [ ] Telegram nur aktiv, wenn Datenweitergabe an Telegram gewünscht und Token sicher bereitgestellt.
- [ ] Backups verschlüsselt (`scripts/backup-postgres.sh`), getrennt gelagert, Restore getestet.
- [ ] Retention-Lauf verifiziert/verdrahtet (R3).
- [ ] M3U-`base_url`-Risiko bewertet (R2).
- [ ] Master-Key-Verlust-/Rotationsprozess dokumentiert (R9).

---

## 17. Grenzen dieser Dokumentation / kein Rechtsgutachten

- Diese Datei beschreibt den **im Repository erkennbaren technischen Stand**. Laufzeit-Konfiguration,
  Infrastruktur-Logs, Reverse-Proxy-Einstellungen, Verträge mit Providern und der konkrete
  Betriebskontext sind **nicht im Code ersichtlich** und hier **nicht bewertet**.
- Es werden **keine** DSGVO-/Rechtskonformitätszusagen gemacht. Formulierungen wie „reduziert Risiko",
  „privacy-orientiert" oder „zu prüfen" sind bewusst gewählt.
- Aussagen zur Datenhaltung beziehen sich auf den Schema-/Code-Stand zum Analysezeitpunkt; spätere
  Änderungen am Schema oder an der Logik können die Bewertung verändern.
- Eine rechtliche Einordnung (z. B. Auftragsverarbeitung, Verzeichnis von Verarbeitungstätigkeiten,
  Datenweitergabe an Telegram) ist durch die verantwortliche Stelle gesondert vorzunehmen.

---

_Weiterführend: [`README.md`](README.md), [`docs/security.md`](docs/security.md),
[`docs/secrets.md`](docs/secrets.md), [`docs/deployment.md`](docs/deployment.md),
[`docs/phase-0-architecture.md`](docs/phase-0-architecture.md)._
