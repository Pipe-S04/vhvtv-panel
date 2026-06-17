'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Pause, Play, Bell, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardEyebrow, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function EinstellungenPage() {
  const queryClient = useQueryClient();

  const monitoringQuery = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: () => api.getMonitoringStatus(),
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.pauseMonitoring(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitoring-status'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resumeMonitoring(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitoring-status'] }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const [retentionChecks, setRetentionChecks] = useState('30');
  const [retentionStats, setRetentionStats] = useState('90');

  useEffect(() => {
    if (settingsQuery.data) {
      const settings = settingsQuery.data.data;
      const checksRetention = settings.find((s) => s.key === 'retention.checks.days');
      const statsRetention = settings.find((s) => s.key === 'retention.stats.days');
      if (checksRetention?.value != null) setRetentionChecks(String(checksRetention.value));
      if (statsRetention?.value != null) setRetentionStats(String(statsRetention.value));
    }
  }, [settingsQuery.data]);

  function handleSaveRetention() {
    updateSettingsMutation.mutate({
      'retention.checks.days': Number(retentionChecks),
      'retention.stats.days': Number(retentionStats),
    });
  }

  const isPaused = monitoringQuery.data?.paused ?? false;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vhv-text">Einstellungen</h1>
        <p className="mt-1 text-sm text-text-muted">
          Systemkonfiguration
        </p>
      </div>

      {/* Monitoring Control */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Monitoring</CardEyebrow>
            <CardTitle>Monitoring-Steuerung</CardTitle>
          </div>
          <Badge tone={isPaused ? 'warning' : 'success'}>
            {isPaused ? 'Pausiert' : 'Aktiv'}
          </Badge>
        </CardHeader>
        <CardContent>
          {monitoringQuery.isLoading && <SkeletonCard />}
          {monitoringQuery.isError && <ErrorState onRetry={() => monitoringQuery.refetch()} />}
          {monitoringQuery.isSuccess && (
            <div className="flex items-center gap-4">
              <p className="text-sm text-text-muted">
                {isPaused
                  ? 'Das Monitoring ist derzeit pausiert. Keine neuen Checks werden ausgeführt.'
                  : 'Das Monitoring ist aktiv. Sender werden regelmäßig überprüft.'}
              </p>
              {isPaused ? (
                <Button
                  variant="primary"
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending}
                >
                  <Play size={16} />
                  Monitoring fortsetzen
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => pauseMutation.mutate()}
                  disabled={pauseMutation.isPending}
                >
                  <Pause size={16} />
                  Monitoring pausieren
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Datenbereinigung</CardEyebrow>
            <CardTitle>Retention-Einstellungen</CardTitle>
          </div>
          <Trash2 size={20} className="text-text-subtle" />
        </CardHeader>
        <CardContent>
          {settingsQuery.isLoading && <SkeletonCard />}
          {settingsQuery.isError && <ErrorState onRetry={() => settingsQuery.refetch()} />}
          {settingsQuery.isSuccess && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Check-Daten aufbewahren (Tage)"
                  type="number"
                  min="1"
                  max="365"
                  value={retentionChecks}
                  onChange={(e) => setRetentionChecks(e.target.value)}
                />
                <Input
                  label="Statistiken aufbewahren (Tage)"
                  type="number"
                  min="1"
                  max="365"
                  value={retentionStats}
                  onChange={(e) => setRetentionStats(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleSaveRetention}
                disabled={updateSettingsMutation.isPending}
              >
                Speichern
              </Button>
              {updateSettingsMutation.isSuccess && (
                <p className="text-sm text-emerald">Einstellungen gespeichert.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>System</CardEyebrow>
            <CardTitle>Allgemeine Einstellungen</CardTitle>
          </div>
          <Settings size={20} className="text-text-subtle" />
        </CardHeader>
        <CardContent>
          {settingsQuery.isLoading && <SkeletonCard />}
          {settingsQuery.isError && <ErrorState onRetry={() => settingsQuery.refetch()} />}
          {settingsQuery.isSuccess && (
            <div className="space-y-2">
              {settingsQuery.data.data
                .filter((s) => !s.key.startsWith('retention.') && s.key !== 'monitoring.paused')
                .map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <span className="text-sm font-medium text-text-muted">{setting.key}</span>
                    <span className="text-sm text-vhv-text">{String(setting.value)}</span>
                  </div>
                ))}
              {settingsQuery.data.data.filter(
                (s) => !s.key.startsWith('retention.') && s.key !== 'monitoring.paused',
              ).length === 0 && (
                <p className="text-sm text-text-muted">Keine weiteren Einstellungen vorhanden.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telegram (prepared) */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Benachrichtigungen</CardEyebrow>
            <CardTitle>Telegram-Integration</CardTitle>
          </div>
          <Badge tone="info">Kommt bald</Badge>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-text-muted">
            Telegram-Benachrichtigungen werden in einer zukünftigen Version verfügbar sein.
            Konfigurieren Sie hier Ihren Bot-Token und die Chat-ID.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bot Token"
              disabled
              placeholder="Wird in Zukunft verfügbar"
            />
            <Input
              label="Chat ID"
              disabled
              placeholder="Wird in Zukunft verfügbar"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Bell size={16} className="text-text-subtle" />
            <span className="text-xs text-text-subtle">
              Benachrichtigungen bei Senderausfällen und -wiederherstellungen
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
