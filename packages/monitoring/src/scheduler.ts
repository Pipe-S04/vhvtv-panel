import { runFfmpegCheck } from './ffmpeg.js';
import { normalizeMeasurement } from './normalize.js';
import type { FfmpegRunner, MonitorChannel, MonitorRepository, CheckNotifier } from './types.js';

export type MonitoringSchedulerOptions = {
  repository: MonitorRepository;
  runner?: FfmpegRunner;
  cooldownMs?: number;
  maxChecksPerTick?: number;
  settingsCacheMs?: number;
  now?: () => Date;
  notifier?: CheckNotifier;
};

export class MonitoringScheduler {
  private readonly repository: MonitorRepository;
  private readonly runner: FfmpegRunner;
  private readonly cooldownMs: number;
  private readonly maxChecksPerTick: number;
  private readonly settingsCacheMs: number;
  private readonly now: () => Date;
  private readonly notifier: CheckNotifier | undefined;
  private localMutex = false;
  private cooldownUntil = 0;
  private cachedSettings: { value: Awaited<ReturnType<MonitorRepository['getSettings']>>; expiresAt: number } | undefined;

  constructor(options: MonitoringSchedulerOptions) {
    this.repository = options.repository;
    this.runner = options.runner ?? runFfmpegCheck;
    this.cooldownMs = options.cooldownMs ?? 1_000;
    this.maxChecksPerTick = Math.max(1, options.maxChecksPerTick ?? 1);
    this.settingsCacheMs = Math.max(0, options.settingsCacheMs ?? 5_000);
    this.now = options.now ?? (() => new Date());
    this.notifier = options.notifier;
  }

  async tick(): Promise<boolean> {
    if (this.localMutex || Date.now() < this.cooldownUntil) {
      return false;
    }

    this.localMutex = true;
    try {
      const settings = await this.getSettings();
      if (settings.paused) return false;

      const channels = await this.getDueChannels();
      if (channels.length === 0) return false;

      const globalLocked = await (this.repository.tryAcquireGlobalLock?.(this.now()) ??
        this.repository.tryAcquireDbLock('global:ffmpeg', this.now()));
      if (!globalLocked) return false;

      let processed = 0;
      try {
        for (const channel of channels) {
          const channelLocked = await this.repository.tryAcquireDbLock(channel.id, this.now());
          if (!channelLocked) continue;

          try {
            await this.checkChannel(channel);
            processed += 1;
          } finally {
            await this.repository.releaseDbLock(channel.id);
          }
        }
        return processed > 0;
      } finally {
        if (this.repository.releaseGlobalLock) {
          await this.repository.releaseGlobalLock();
        } else {
          await this.repository.releaseDbLock('global:ffmpeg');
        }
      }
    } finally {
      this.cooldownUntil = Date.now() + this.cooldownMs;
      this.localMutex = false;
    }
  }

  private async getSettings() {
    const now = Date.now();
    if (this.cachedSettings && this.cachedSettings.expiresAt > now) {
      return this.cachedSettings.value;
    }

    const value = await this.repository.getSettings();
    this.cachedSettings = { value, expiresAt: now + this.settingsCacheMs };
    return value;
  }

  private async getDueChannels(): Promise<MonitorChannel[]> {
    if (this.repository.getDueChannels) {
      return this.repository.getDueChannels(this.now(), this.maxChecksPerTick);
    }

    const channel = await this.repository.getDueChannel(this.now());
    return channel ? [channel] : [];
  }

  private async checkChannel(channel: MonitorChannel): Promise<void> {
    const timeoutMs = Math.max(1, channel.checkDurationSeconds) * 1000;
    const measurement = normalizeMeasurement(await this.runner(channel.streamUrl, timeoutMs));
    const nextCheckAt = new Date(
      this.now().getTime() + Math.max(1, channel.checkIntervalMinutes) * 60_000
    );
    await this.repository.recordCheck(channel, measurement, nextCheckAt);
    await this.notifier?.notifyCheckResult(channel, measurement);
  }
}
