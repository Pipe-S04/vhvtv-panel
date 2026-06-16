import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { sanitizeError } from '@vhvtv/shared';
import { normalizeMeasurement } from './normalize.js';
import type { NormalizedMeasurement } from './types.js';

export type SpawnFfmpeg = (file: string, args: readonly string[]) => ChildProcessWithoutNullStreams;

export function buildFfmpegArgs(inputUrl: string, durationSeconds: number): string[] {
  return [
    '-hide_banner',
    '-nostdin',
    '-loglevel',
    'warning',
    '-rw_timeout',
    String(Math.max(1, durationSeconds) * 1_000_000),
    '-i',
    inputUrl,
    '-t',
    String(Math.max(1, durationSeconds)),
    '-map',
    '0:v:0?',
    '-map',
    '0:a:0?',
    '-f',
    'null',
    '-'
  ];
}

export async function runFfmpegCheck(
  inputUrl: string,
  timeoutMs: number,
  spawnFfmpeg: SpawnFfmpeg = (file, args) => spawn(file, [...args])
): Promise<NormalizedMeasurement> {
  const startedAt = Date.now();
  const args = buildFfmpegArgs(inputUrl, Math.ceil(timeoutMs / 1000));
  const child = spawnFfmpeg('ffmpeg', args);
  let stderr = '';
  let timedOut = false;

  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });

  const watchdog = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, timeoutMs);

  try {
    const [code] = (await once(child, 'close')) as [number | null, NodeJS.Signals | null];
    const checkDurationMs = Date.now() - startedAt;
    if (timedOut) {
      return normalizeMeasurement({
        status: 'timeout',
        errorCode: 'CONNECT_TIMEOUT',
        sanitizedErrorMessage: 'FFmpeg watchdog timeout exceeded.',
        checkDurationMs
      });
    }

    if (code === 0) {
      return normalizeMeasurement({
        status: 'success',
        audioDetected: true,
        videoDetected: true,
        checkDurationMs
      });
    }

    return normalizeMeasurement({
      status: 'failed',
      errorCode: classifyFfmpegError(stderr),
      sanitizedErrorMessage: sanitizeError(stderr || `FFmpeg exited with code ${code}`).message,
      checkDurationMs
    });
  } finally {
    clearTimeout(watchdog);
  }
}

function classifyFfmpegError(stderr: string): NonNullable<NormalizedMeasurement['errorCode']> {
  if (/401/.test(stderr)) return 'HTTP_401';
  if (/403/.test(stderr)) return 'HTTP_403';
  if (/404/.test(stderr)) return 'HTTP_404';
  if (/429/.test(stderr)) return 'HTTP_429';
  if (/5\d\d/.test(stderr)) return 'HTTP_500';
  if (/timed?\s*out|timeout/i.test(stderr)) return 'CONNECT_TIMEOUT';
  if (/name.*not.*resolved|dns/i.test(stderr)) return 'DNS_ERROR';
  if (/no.*video/i.test(stderr)) return 'NO_VIDEO';
  if (/decoder|decode/i.test(stderr)) return 'DECODER_ERROR';
  return 'UNKNOWN_ERROR';
}
