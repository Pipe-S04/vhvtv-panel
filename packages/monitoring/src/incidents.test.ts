import { describe, expect, it } from 'vitest';
import { nextIncidentState } from './incidents.js';

describe('incident state machine', () => {
  it('follows Online -> Suspect -> Degraded -> Offline -> Recovering -> Online', () => {
    const suspect = nextIncidentState('online', 'failed');
    const degraded = nextIncidentState(suspect, 'failed');
    const offline = nextIncidentState(degraded, 'failed');
    const recovering = nextIncidentState(offline, 'success');
    const online = nextIncidentState(recovering, 'success');

    expect([suspect, degraded, offline, recovering, online]).toEqual([
      'suspect',
      'degraded',
      'offline',
      'recovering',
      'online'
    ]);
  });
});
