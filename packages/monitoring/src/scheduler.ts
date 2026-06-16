import { runFfmpegCheck } from './ffmpeg.js';
import { normalizeMeasurement } from './normalize.js';
import type { FfmpegRunner, MonitorChannel, MonitorRepository } from './types.js';

export type MonitoringSchedulerOptions = {
  repository: MonitorRepository;
  runner?: FfmpegRunner;
  cooldownMs?: number;
  now?: () => Date;
};

export class MonitoringScheduler {
  private readonly repository: MonitorRepository;
  private readonly runner: FfmpegRunner;
  private readonly cooldownMs: number;
  private readonly now: () => Date;
  private localMutex = false;
  private cooldownUntil = 0;

  constructor(options: MonitoringSchedulerOptions) {
    this.repository = options.repository;
    this.runner = options.runner ?? runFfmpegCheck;
    this.cooldownMs = options.cooldownMs ?? 1_000;
    this.now = options.now ?? (() => new Date());
  }

  async tick(): Promise<boolean> {
    if (this.localMutex || Date.now() < this.cooldownUntil) {
      return false;
    }

    this.localMutex = true;
    try {
      const settings = await this.repository.getSettings();
      if (settings.paused) return false;

      const channel = await this.repository.getDueChannel(this.now());
      if (!channel) return false;

      const locked = await this.repository.tryAcquireDbLock(channel.id, this.now());
      if (!locked) return false;

      try {
        await this.checkChannel(channel);
        return true;
      } finally {
        await this.repository.releaseDbLock(channel.id);
      }
    } finally {
      this.cooldownUntil = Date.now() + this.cooldownMs;
      this.localMutex = false;
    }
  }

  private async checkChannel(channel: MonitorChannel): Promise<void> {
    const timeoutMs = Math.max(1, channel.checkDurationSeconds) * 1000;
    const measurement = normalizeMeasurement(await this.runner(channel.streamUrl, timeoutMs));
    const nextCheckAt = new Date(
      this.now().getTime() + Math.max(1, channel.checkIntervalMinutes) * 60_000
    );
    await this.repository.recordCheck(channel, measurement, nextCheckAt);
  }
}
