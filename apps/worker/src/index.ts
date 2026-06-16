import { MonitoringScheduler, type MonitorRepository } from '@vhvtv/monitoring';

export type WorkerOptions = {
  repository: MonitorRepository;
  intervalMs?: number;
};

export function startMonitoringWorker(options: WorkerOptions): () => void {
  const scheduler = new MonitoringScheduler({
    repository: options.repository,
    cooldownMs: Math.max(100, options.intervalMs ?? 1_000)
  });
  const timer = setInterval(() => {
    void scheduler.tick();
  }, options.intervalMs ?? 1_000);

  return () => clearInterval(timer);
}
