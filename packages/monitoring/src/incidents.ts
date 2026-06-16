export const MONITOR_INCIDENT_STATES = [
  'online',
  'suspect',
  'degraded',
  'offline',
  'recovering'
] as const;

export type MonitorIncidentState = (typeof MONITOR_INCIDENT_STATES)[number];

export type IncidentCheckResult = 'success' | 'failed' | 'timeout' | 'partial';

export function nextIncidentState(
  current: MonitorIncidentState,
  checkStatus: IncidentCheckResult
): MonitorIncidentState {
  const success = checkStatus === 'success';

  switch (current) {
    case 'online':
      return success ? 'online' : 'suspect';
    case 'suspect':
      return success ? 'online' : 'degraded';
    case 'degraded':
      return success ? 'recovering' : 'offline';
    case 'offline':
      return success ? 'recovering' : 'offline';
    case 'recovering':
      return success ? 'online' : 'degraded';
  }
}
