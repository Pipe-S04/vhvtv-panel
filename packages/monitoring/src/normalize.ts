import { sanitizeError } from '@vhvtv/shared';
import type { ErrorCode } from '@vhvtv/database';
import { toStandardErrorCode } from './codes.js';
import type { Measurement, NormalizedMeasurement } from './types.js';

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function assignNumber(
  output: NormalizedMeasurement,
  key: keyof Pick<
    NormalizedMeasurement,
    | 'connectionMs'
    | 'firstByteMs'
    | 'firstVideoFrameMs'
    | 'firstAudioFrameMs'
    | 'totalStartupMs'
    | 'checkDurationMs'
    | 'receivedBytes'
    | 'averageBitrateKbps'
    | 'width'
    | 'height'
    | 'freezeDurationMs'
    | 'blackDurationMs'
    | 'httpStatus'
  >,
  value: unknown
): void {
  const normalized = nonNegativeInteger(value);
  if (normalized !== undefined) {
    output[key] = normalized;
  }
}

export function normalizeMeasurement(input: Partial<Measurement>): NormalizedMeasurement {
  const status = input.status ?? (input.errorCode ? 'failed' : 'success');
  const output: NormalizedMeasurement = {
    status,
    audioDetected: input.audioDetected === true,
    videoDetected: input.videoDetected === true,
    decoderErrors: nonNegativeInteger(input.decoderErrors) ?? 0
  };

  if (input.errorCode) output.errorCode = toStandardErrorCode(input.errorCode) as ErrorCode;
  if (input.sanitizedErrorMessage) {
    output.sanitizedErrorMessage = sanitizeError(input.sanitizedErrorMessage).message;
  }

  assignNumber(output, 'connectionMs', input.connectionMs);
  assignNumber(output, 'firstByteMs', input.firstByteMs);
  assignNumber(output, 'firstVideoFrameMs', input.firstVideoFrameMs);
  assignNumber(output, 'firstAudioFrameMs', input.firstAudioFrameMs);
  assignNumber(output, 'totalStartupMs', input.totalStartupMs);
  assignNumber(output, 'checkDurationMs', input.checkDurationMs);
  assignNumber(output, 'receivedBytes', input.receivedBytes);
  assignNumber(output, 'averageBitrateKbps', input.averageBitrateKbps);
  assignNumber(output, 'width', input.width);
  assignNumber(output, 'height', input.height);
  assignNumber(output, 'freezeDurationMs', input.freezeDurationMs);
  assignNumber(output, 'blackDurationMs', input.blackDurationMs);
  assignNumber(output, 'httpStatus', input.httpStatus);

  const videoCodec = optionalString(input.videoCodec);
  if (videoCodec) output.videoCodec = videoCodec;
  const audioCodec = optionalString(input.audioCodec);
  if (audioCodec) output.audioCodec = audioCodec;
  if (typeof input.fps === 'number' && Number.isFinite(input.fps))
    output.fps = Math.max(0, input.fps);

  return output;
}
