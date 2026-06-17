import { describe, expect, it } from 'vitest';
import { MonitoringScheduler } from './scheduler.js';
import type { MonitorChannel, MonitorRepository } from './types.js';

function channel(): MonitorChannel {
  return {
    id: 'channel-1',
    streamUrl: 'https://example.test/live.ts',
    checkDurationSeconds: 1,
    checkIntervalMinutes: 5,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    currentStatus: 'unknown'
  };
}

describe('MonitoringScheduler', () => {
  it('enforces global concurrency of exactly one local check', async () => {
    let running = 0;
    let maxRunning = 0;
    let records = 0;
    const repository: MonitorRepository = {
      async getSettings() {
        return { paused: false };
      },
      async getDueChannel() {
        return channel();
      },
      async tryAcquireDbLock() {
        return true;
      },
      async releaseDbLock() {},
      async recordCheck() {
        records += 1;
      }
    };
    const scheduler = new MonitoringScheduler({
      repository,
      cooldownMs: 0,
      runner: async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 20));
        running -= 1;
        return { status: 'success', audioDetected: true, videoDetected: true, decoderErrors: 0 };
      }
    });

    await Promise.all([scheduler.tick(), scheduler.tick(), scheduler.tick()]);

    expect(maxRunning).toBe(1);
    expect(records).toBe(1);
  });



  it('prevents two scheduler instances from starting FFmpeg in parallel', async () => {
    let globalLocked = false;
    let running = 0;
    let maxRunning = 0;
    let checks = 0;
    const repository: MonitorRepository = {
      async getSettings() {
        return { paused: false };
      },
      async getDueChannel() {
        return channel();
      },
      async tryAcquireGlobalLock() {
        if (globalLocked) return false;
        globalLocked = true;
        return true;
      },
      async releaseGlobalLock() {
        globalLocked = false;
      },
      async tryAcquireDbLock() {
        return true;
      },
      async releaseDbLock() {},
      async recordCheck() {
        checks += 1;
      }
    };
    const runner = async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running -= 1;
      return { status: 'success' as const, audioDetected: true, videoDetected: true, decoderErrors: 0 };
    };

    const first = new MonitoringScheduler({ repository, cooldownMs: 0, runner });
    const second = new MonitoringScheduler({ repository, cooldownMs: 0, runner });

    await Promise.all([first.tick(), second.tick()]);

    expect(maxRunning).toBe(1);
    expect(checks).toBe(1);
  });

  it('honors pause settings before lock acquisition', async () => {
    let locks = 0;
    const repository: MonitorRepository = {
      async getSettings() {
        return { paused: true };
      },
      async getDueChannel() {
        return channel();
      },
      async tryAcquireDbLock() {
        locks += 1;
        return true;
      },
      async releaseDbLock() {},
      async recordCheck() {}
    };

    const scheduler = new MonitoringScheduler({ repository, cooldownMs: 0 });

    await expect(scheduler.tick()).resolves.toBe(false);
    expect(locks).toBe(0);
  });
});
