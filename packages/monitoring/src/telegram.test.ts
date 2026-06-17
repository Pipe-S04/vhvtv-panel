import { describe, expect, it } from 'vitest';
import {
  TelegramIncidentNotifier,
  formatTelegramMessage,
  notificationKind,
  normalizeTelegramConfig
} from './telegram.js';
import type { MonitorChannel, NormalizedMeasurement } from './types.js';

function channel(overrides: Partial<MonitorChannel> = {}): MonitorChannel {
  return {
    id: 'channel-1',
    streamUrl: 'https://secret.example.test/live.m3u8?token=do-not-leak',
    checkDurationSeconds: 1,
    checkIntervalMinutes: 5,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    currentStatus: 'unknown',
    ...overrides
  };
}

const failed: NormalizedMeasurement = {
  status: 'failed',
  errorCode: 'CONNECT_TIMEOUT',
  sanitizedErrorMessage: 'sanitized only',
  audioDetected: false,
  videoDetected: false,
  decoderErrors: 0
};

const success: NormalizedMeasurement = {
  status: 'success',
  totalStartupMs: 1420,
  audioDetected: true,
  videoDetected: true,
  decoderErrors: 0
};

describe('Telegram incident notifications', () => {
  it('requires secure token and chat id only when enabled', () => {
    expect(normalizeTelegramConfig({ enabled: false })).toMatchObject({ enabled: false });
    expect(() => normalizeTelegramConfig({ enabled: true, botToken: 'token' })).toThrow(
      /TELEGRAM_CHAT_ID/
    );
    expect(() => normalizeTelegramConfig({ enabled: true, chatId: 'chat' })).toThrow(
      /TELEGRAM_BOT_TOKEN/
    );
  });

  it('alerts only after a confirmed incident and recovers after two successful checks', () => {
    expect(notificationKind(channel({ consecutiveFailures: 1 }), failed)).toBeUndefined();
    expect(notificationKind(channel({ consecutiveFailures: 2 }), failed)).toBe('incident');
    expect(
      notificationKind(channel({ consecutiveFailures: 3, consecutiveSuccesses: 0 }), success)
    ).toBeUndefined();
    expect(
      notificationKind(channel({ consecutiveFailures: 3, consecutiveSuccesses: 1 }), success)
    ).toBe('recovery');
  });

  it('uses cooldown and a mocked client', async () => {
    let now = new Date('2026-01-01T00:00:00.000Z');
    const sent: string[] = [];
    const notifier = new TelegramIncidentNotifier({
      config: { enabled: true, botToken: 'token', chatId: 'chat', cooldownMs: 1_000 },
      now: () => now,
      client: {
        async sendMessage(_token, _chat, text) {
          sent.push(text);
        }
      }
    });

    await expect(
      notifier.notifyCheckResult(channel({ consecutiveFailures: 2 }), failed)
    ).resolves.toBe(true);
    await expect(
      notifier.notifyCheckResult(channel({ consecutiveFailures: 2 }), failed)
    ).resolves.toBe(false);
    now = new Date('2026-01-01T00:00:01.001Z');
    await expect(
      notifier.notifyCheckResult(channel({ consecutiveFailures: 2 }), failed)
    ).resolves.toBe(true);
    expect(sent).toHaveLength(2);
  });

  it('does not include credentials, stream URLs, or raw FFmpeg errors in messages', () => {
    const message = formatTelegramMessage(
      'incident',
      channel({ consecutiveFailures: 2 }),
      failed,
      new Date('2026-01-01T00:00:00.000Z')
    );

    expect(message).not.toContain('secret.example.test');
    expect(message).not.toContain('do-not-leak');
    expect(message).not.toContain('https://');
    expect(message).not.toContain('sanitized only');
    expect(message).toContain('CONNECT_TIMEOUT');
    expect(message).toContain('🔴 Sender offline');
  });

  it('formats German recovery messages with startup time', () => {
    const message = formatTelegramMessage(
      'recovery',
      channel({ name: 'RTL HD', categoryName: 'Deutschland' }),
      success,
      new Date('2026-01-01T13:32:00.000Z')
    );

    expect(message).toContain('🟢 Sender wieder online');
    expect(message).toContain('Sender: RTL HD');
    expect(message).toContain('Aktuelle Startzeit: 1,42 Sekunden');
    expect(message).not.toContain('Deutschland');
  });
});
