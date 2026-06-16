import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { buildFfmpegArgs, runFfmpegCheck, type SpawnFfmpeg } from './ffmpeg.js';

function hangingProcess() {
  const child = new EventEmitter() as ReturnType<SpawnFfmpeg>;
  child.stderr = new Readable({ read() {} }) as ReturnType<SpawnFfmpeg>['stderr'];
  child.kill = vi.fn(() => {
    setImmediate(() => child.emit('close', null, 'SIGKILL'));
    return true;
  }) as ReturnType<SpawnFfmpeg>['kill'];
  return child;
}

describe('ffmpeg runner', () => {
  it('builds an argument array with the input URL as a single argument', () => {
    const url = 'https://example.test/a b/stream.ts?token=x;y';

    expect(buildFfmpegArgs(url, 3)).toContain(url);
  });

  it('kills the ffmpeg process when the watchdog timeout expires', async () => {
    const child = hangingProcess();
    const spawnFfmpeg = vi.fn(() => child);

    const measurement = await runFfmpegCheck('https://example.test/live.ts', 5, spawnFfmpeg);

    expect(spawnFfmpeg.mock.calls[0]?.[1]).toEqual(expect.any(Array));
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(measurement.status).toBe('timeout');
    expect(measurement.errorCode).toBe('CONNECT_TIMEOUT');
  });
});
