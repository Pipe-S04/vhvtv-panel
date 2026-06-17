import { describe, it, expect } from 'vitest';
import { api, ApiError } from '../lib/api-client';

describe('API client', () => {
  it('exports all expected methods', () => {
    expect(api.getDashboard).toBeDefined();
    expect(api.getDashboardIncidents).toBeDefined();
    expect(api.getStatusSummary).toBeDefined();
    expect(api.getChannels).toBeDefined();
    expect(api.getChannel).toBeDefined();
    expect(api.updateChannel).toBeDefined();
    expect(api.triggerCheck).toBeDefined();
    expect(api.bulkMonitor).toBeDefined();
    expect(api.getProviders).toBeDefined();
    expect(api.getProvider).toBeDefined();
    expect(api.createProvider).toBeDefined();
    expect(api.updateProvider).toBeDefined();
    expect(api.deleteProvider).toBeDefined();
    expect(api.testProvider).toBeDefined();
    expect(api.importProvider).toBeDefined();
    expect(api.getCategories).toBeDefined();
    expect(api.getCategory).toBeDefined();
    expect(api.getIncidents).toBeDefined();
    expect(api.getIncident).toBeDefined();
    expect(api.acknowledgeIncident).toBeDefined();
    expect(api.getAvailabilityStats).toBeDefined();
    expect(api.getStartupTimeStats).toBeDefined();
    expect(api.getBitrateStats).toBeDefined();
    expect(api.getSettings).toBeDefined();
    expect(api.updateSettings).toBeDefined();
    expect(api.pauseMonitoring).toBeDefined();
    expect(api.resumeMonitoring).toBeDefined();
    expect(api.getMonitoringStatus).toBeDefined();
  });

  it('ApiError has correct properties', () => {
    const error = new ApiError(404, 'Not Found', { detail: 'missing' });
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.body).toEqual({ detail: 'missing' });
    expect(error.message).toBe('API 404: Not Found');
    expect(error.name).toBe('ApiError');
  });
});
