import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({ channelId: 'test-id' }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api-client', () => ({
  api: {
    getDashboard: vi.fn(),
    getDashboardIncidents: vi.fn(),
    getStatusSummary: vi.fn(),
    getChannels: vi.fn(),
    getChannel: vi.fn(),
    getProviders: vi.fn(),
    getCategories: vi.fn(),
    getIncidents: vi.fn(),
    getAvailabilityStats: vi.fn(),
    getStartupTimeStats: vi.fn(),
    getBitrateStats: vi.fn(),
    getSettings: vi.fn(),
    getMonitoringStatus: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(s: number) { super(''); this.status = s; }
  },
}));

describe('Page modules can be imported', () => {
  it('dashboard page exports default', async () => {
    const mod = await import('../app/(app)/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('sender page exports default', async () => {
    const mod = await import('../app/(app)/sender/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('channel detail page exports default', async () => {
    const mod = await import('../app/(app)/sender/[channelId]/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('kategorien page exports default', async () => {
    const mod = await import('../app/(app)/kategorien/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('incidents page exports default', async () => {
    const mod = await import('../app/(app)/incidents/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('statistiken page exports default', async () => {
    const mod = await import('../app/(app)/statistiken/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('provider page exports default', async () => {
    const mod = await import('../app/(app)/provider/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('einstellungen page exports default', async () => {
    const mod = await import('../app/(app)/einstellungen/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('Layout modules can be imported', () => {
  it('root layout exports default', async () => {
    const mod = await import('../app/layout');
    expect(mod.default).toBeDefined();
  });

  it('app layout exports default', async () => {
    const mod = await import('../app/(app)/layout');
    expect(mod.default).toBeDefined();
  });
});

describe('Sidebar can be imported', () => {
  it('sidebar exports Sidebar', async () => {
    const mod = await import('../components/layout/sidebar');
    expect(mod.Sidebar).toBeDefined();
  });
});
