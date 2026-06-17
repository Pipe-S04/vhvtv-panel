import type { NormalizedMeasurement, MonitorChannel } from './types.js';

export type TelegramConfig = {
  enabled: boolean;
  botToken: string | undefined;
  chatId: string | undefined;
  cooldownMs: number;
};

export type TelegramClient = {
  sendMessage(botToken: string, chatId: string, text: string): Promise<void>;
};

export type IncidentNotificationKind = 'incident' | 'recovery';

export const CONFIRMED_INCIDENT_FAILURES = 3;
export const RECOVERY_SUCCESS_CHECKS = 2;

const DEFAULT_COOLDOWN_MS = 30 * 60_000;

export function normalizeTelegramConfig(config: Partial<TelegramConfig>): TelegramConfig {
  const enabled = config.enabled ?? false;
  const botToken = config.botToken?.trim();
  const chatId = config.chatId?.trim();
  const cooldownMs = Math.max(0, config.cooldownMs ?? DEFAULT_COOLDOWN_MS);

  if (enabled && (!botToken || !chatId)) {
    throw new Error(
      'Telegram alerts require TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID when enabled.'
    );
  }

  return { enabled, botToken, chatId, cooldownMs };
}

export class FetchTelegramClient implements TelegramClient {
  async sendMessage(botToken: string, chatId: string, text: string): Promise<void> {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
    });

    if (!response.ok) {
      throw new Error(`Telegram sendMessage failed with HTTP ${response.status}`);
    }
  }
}

export class TelegramIncidentNotifier {
  private readonly config: TelegramConfig;
  private readonly client: TelegramClient;
  private readonly now: () => Date;
  private readonly cooldownUntilByKey = new Map<string, number>();

  constructor(options: {
    config: Partial<TelegramConfig>;
    client?: TelegramClient;
    now?: () => Date;
  }) {
    this.config = normalizeTelegramConfig(options.config);
    this.client = options.client ?? new FetchTelegramClient();
    this.now = options.now ?? (() => new Date());
  }

  async notifyCheckResult(
    channel: MonitorChannel,
    measurement: NormalizedMeasurement
  ): Promise<boolean> {
    if (!this.config.enabled) return false;

    const kind = notificationKind(channel, measurement);
    if (!kind) return false;

    const key = `${channel.id}:${kind}`;
    const nowMs = this.now().getTime();
    if ((this.cooldownUntilByKey.get(key) ?? 0) > nowMs) return false;

    await this.client.sendMessage(
      this.config.botToken!,
      this.config.chatId!,
      formatTelegramMessage(kind, channel, measurement, this.now())
    );
    this.cooldownUntilByKey.set(key, nowMs + this.config.cooldownMs);
    return true;
  }
}

export function notificationKind(
  channel: MonitorChannel,
  measurement: NormalizedMeasurement
): IncidentNotificationKind | undefined {
  if (measurement.status === 'success') {
    const recoverySuccesses = channel.consecutiveSuccesses + 1;
    if (
      recoverySuccesses >= RECOVERY_SUCCESS_CHECKS &&
      channel.consecutiveFailures >= CONFIRMED_INCIDENT_FAILURES
    ) {
      return 'recovery';
    }
    return undefined;
  }

  const failures = channel.consecutiveFailures + 1;
  return failures >= CONFIRMED_INCIDENT_FAILURES ? 'incident' : undefined;
}

export function formatTelegramMessage(
  kind: IncidentNotificationKind,
  channel: MonitorChannel,
  measurement: NormalizedMeasurement,
  at: Date
): string {
  const channelName = channel.name ?? channel.id;

  if (kind === 'recovery') {
    const lines = ['🟢 Sender wieder online', '', `Sender: ${channelName}`];
    if (measurement.totalStartupMs !== undefined) {
      lines.push(`Aktuelle Startzeit: ${formatSeconds(measurement.totalStartupMs)}`);
    }
    lines.push(`Zeit: ${formatGermanTime(at)}`);
    return lines.join('\n');
  }

  const failures = Math.max(CONFIRMED_INCIDENT_FAILURES, channel.consecutiveFailures + 1);
  const lines = [
    '🔴 Sender offline',
    '',
    `Sender: ${channelName}`,
    `Fehler: ${measurement.errorCode ?? 'UNKNOWN_ERROR'}`,
    `Fehlgeschlagene Checks: ${failures}`,
    `Seit: ${formatGermanTime(at)}`
  ];

  if (channel.categoryName) {
    lines.splice(3, 0, `Kategorie: ${channel.categoryName}`);
  }

  return lines.join('\n');
}

function formatGermanTime(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin'
  })
    .format(date)
    .replace(':', ':');
}

function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} Sekunden`;
}
