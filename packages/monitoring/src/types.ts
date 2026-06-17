import type { ChannelStatus, CheckStatus, ErrorCode } from '@vhvtv/database';

export type MonitorChannel = {
  id: string;
  name?: string;
  categoryName?: string;
  streamUrl: string;
  checkDurationSeconds: number;
  checkIntervalMinutes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  currentStatus: ChannelStatus;
};

export type Measurement = {
  status: CheckStatus;
  errorCode?: ErrorCode;
  sanitizedErrorMessage?: string;
  connectionMs?: number;
  firstByteMs?: number;
  firstVideoFrameMs?: number;
  firstAudioFrameMs?: number;
  totalStartupMs?: number;
  checkDurationMs?: number;
  receivedBytes?: number;
  averageBitrateKbps?: number;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  fps?: number;
  audioDetected: boolean;
  videoDetected: boolean;
  decoderErrors: number;
  freezeDurationMs?: number;
  blackDurationMs?: number;
  httpStatus?: number;
};

export type NormalizedMeasurement = {
  status: CheckStatus;
  errorCode?: ErrorCode;
  sanitizedErrorMessage?: string;
  connectionMs?: number;
  firstByteMs?: number;
  firstVideoFrameMs?: number;
  firstAudioFrameMs?: number;
  totalStartupMs?: number;
  checkDurationMs?: number;
  receivedBytes?: number;
  averageBitrateKbps?: number;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  fps?: number;
  audioDetected: boolean;
  videoDetected: boolean;
  decoderErrors: number;
  freezeDurationMs?: number;
  blackDurationMs?: number;
  httpStatus?: number;
};

export type MonitorSettings = {
  paused: boolean;
};

export type MonitorRepository = {
  getSettings(): Promise<MonitorSettings>;
  getDueChannel(now: Date): Promise<MonitorChannel | undefined>;
  tryAcquireDbLock(channelId: string, now: Date): Promise<boolean>;
  releaseDbLock(channelId: string): Promise<void>;
  recordCheck(
    channel: MonitorChannel,
    measurement: NormalizedMeasurement,
    nextCheckAt: Date
  ): Promise<void>;
};

export type FfmpegRunner = (inputUrl: string, timeoutMs: number) => Promise<NormalizedMeasurement>;

export type CheckNotifier = {
  notifyCheckResult(channel: MonitorChannel, measurement: NormalizedMeasurement): Promise<boolean>;
};
