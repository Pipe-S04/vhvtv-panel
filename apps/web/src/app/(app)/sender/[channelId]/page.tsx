'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api-client';
import { formatDate, formatDateShort, formatDuration, formatPercent, getStatusLabel } from '@/lib/utils';
import { Card, CardContent, CardEyebrow, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-dot';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Kritisch',
  reference: 'Referenz',
  manual: 'Manuell',
  retry: 'Wiederholung',
};

const PRIORITY_TONES: Record<string, 'danger' | 'gold' | 'neutral' | 'warning'> = {
  critical: 'danger',
  reference: 'gold',
  manual: 'neutral',
  retry: 'warning',
};

export default function ChannelDetailPage() {
  const params = useParams<{ channelId: string }>();
  const channelId = params.channelId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const channelQuery = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => api.getChannel(channelId),
  });

  const availabilityQuery = useQuery({
    queryKey: ['availability', channelId],
    queryFn: () => api.getAvailabilityStats({ channelId, hours: 24 }),
  });

  const startupQuery = useQuery({
    queryKey: ['startup-times', channelId],
    queryFn: () => api.getStartupTimeStats({ channelId, hours: 24 }),
  });

  const bitrateQuery = useQuery({
    queryKey: ['bitrates', channelId],
    queryFn: () => api.getBitrateStats({ channelId, hours: 24 }),
  });

  const incidentsQuery = useQuery({
    queryKey: ['channel-incidents', channelId],
    queryFn: () => api.getIncidents({ channelId, limit: 20 }),
  });

  const triggerCheckMutation = useMutation({
    mutationFn: () => api.triggerCheck(channelId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channel', channelId] }),
  });

  const updateChannelMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.updateChannel>[1]) =>
      api.updateChannel(channelId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channel', channelId] }),
  });

  const channel = channelQuery.data;

  if (channelQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (channelQuery.isError) {
    return <ErrorState onRetry={() => channelQuery.refetch()} />;
  }

  if (!channel) return null;

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <button
        onClick={() => router.push('/sender')}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-vhv-text transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zur Senderliste
      </button>

      {/* Channel Header */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <StatusDot status={channel.currentStatus} />
              <div>
                <h1 className="text-2xl font-bold text-vhv-text">{channel.name}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={PRIORITY_TONES[channel.priority] ?? 'neutral'}>
                    {PRIORITY_LABELS[channel.priority] ?? channel.priority}
                  </Badge>
                  <span className="text-sm text-text-muted">
                    {getStatusLabel(channel.currentStatus)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => triggerCheckMutation.mutate()}
                disabled={triggerCheckMutation.isPending}
              >
                <Play size={14} />
                Jetzt prüfen
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateChannelMutation.mutate({
                    monitorEnabled: !channel.monitorEnabled,
                  })
                }
                disabled={updateChannelMutation.isPending}
              >
                {channel.monitorEnabled ? 'Monitoring deaktivieren' : 'Monitoring aktivieren'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <CardEyebrow>Monitoring</CardEyebrow>
            <p className="text-lg font-semibold text-vhv-text">
              {channel.monitorEnabled ? 'Aktiv' : 'Inaktiv'}
            </p>
            <p className="text-sm text-text-muted">
              Intervall: {channel.checkIntervalMinutes} Min.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardEyebrow>Letzter Check</CardEyebrow>
            <p className="text-lg font-semibold text-vhv-text">
              {formatDateShort(channel.lastCheckAt)}
            </p>
            <p className="text-sm text-text-muted">
              Status: {getStatusLabel(channel.currentStatus)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardEyebrow>Fehlerfolge</CardEyebrow>
            <p className="text-lg font-semibold text-ruby">
              {channel.consecutiveFailures}
            </p>
            <p className="text-sm text-text-muted">
              Erfolge: {channel.consecutiveSuccesses}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardEyebrow>Check-Dauer</CardEyebrow>
            <p className="text-lg font-semibold text-vhv-text">
              {channel.checkDurationSeconds} Sek.
            </p>
            <p className="text-sm text-text-muted">
              Priorität: {PRIORITY_LABELS[channel.priority] ?? channel.priority}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Konfiguration</CardEyebrow>
            <CardTitle>Monitoring-Einstellungen</CardTitle>
          </div>
          <Settings size={20} className="text-text-subtle" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Check-Intervall"
              value={String(channel.checkIntervalMinutes)}
              onChange={(e) =>
                updateChannelMutation.mutate({
                  checkIntervalMinutes: Number(e.target.value),
                })
              }
            >
              <option value="5">5 Minuten</option>
              <option value="10">10 Minuten</option>
              <option value="15">15 Minuten</option>
              <option value="30">30 Minuten</option>
              <option value="60">60 Minuten</option>
            </Select>
            <Select
              label="Check-Dauer"
              value={String(channel.checkDurationSeconds)}
              onChange={(e) =>
                updateChannelMutation.mutate({
                  checkDurationSeconds: Number(e.target.value),
                })
              }
            >
              <option value="5">5 Sekunden</option>
              <option value="10">10 Sekunden</option>
              <option value="15">15 Sekunden</option>
              <option value="30">30 Sekunden</option>
              <option value="60">60 Sekunden</option>
            </Select>
            <Select
              label="Priorität"
              value={channel.priority}
              onChange={(e) =>
                updateChannelMutation.mutate({ priority: e.target.value as 'critical' | 'reference' | 'manual' | 'retry' })
              }
            >
              <option value="critical">Kritisch</option>
              <option value="reference">Referenz</option>
              <option value="manual">Manuell</option>
              <option value="retry">Wiederholung</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Availability Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>Letzte 24 Stunden</CardEyebrow>
              <CardTitle>Verfügbarkeit</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {availabilityQuery.isLoading && <div className="h-48 animate-pulse rounded-lg bg-surface-elevated" />}
            {availabilityQuery.isError && <ErrorState onRetry={() => availabilityQuery.refetch()} />}
            {availabilityQuery.isSuccess && availabilityQuery.data.data.length === 0 && (
              <EmptyState title="Keine Daten" description="Noch keine Verfügbarkeitsdaten vorhanden." />
            )}
            {availabilityQuery.isSuccess && availabilityQuery.data.data.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={availabilityQuery.data.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="channelName" tick={{ fill: '#8e99aa', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#8e99aa', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', color: '#f7f9fc' }}
                    formatter={(value: number) => [formatPercent(value), 'Verfügbarkeit']}
                  />
                  <Area type="monotone" dataKey="availabilityPercent" stroke="#22c787" fill="#22c787" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Startup Time Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>Letzte 24 Stunden</CardEyebrow>
              <CardTitle>Startzeiten</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {startupQuery.isLoading && <div className="h-48 animate-pulse rounded-lg bg-surface-elevated" />}
            {startupQuery.isError && <ErrorState onRetry={() => startupQuery.refetch()} />}
            {startupQuery.isSuccess && startupQuery.data.data.length === 0 && (
              <EmptyState title="Keine Daten" description="Noch keine Startzeitdaten vorhanden." />
            )}
            {startupQuery.isSuccess && startupQuery.data.data.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={startupQuery.data.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="channelName" tick={{ fill: '#8e99aa', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#8e99aa', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', color: '#f7f9fc' }}
                    formatter={(value: number) => [formatDuration(value), '']}
                  />
                  <Bar dataKey="avgStartupMs" name="Ø Startzeit" fill="#168bff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maxStartupMs" name="Max" fill="#f5b942" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bitrate Chart */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Letzte 24 Stunden</CardEyebrow>
            <CardTitle>Bitrate</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {bitrateQuery.isLoading && <div className="h-48 animate-pulse rounded-lg bg-surface-elevated" />}
          {bitrateQuery.isError && <ErrorState onRetry={() => bitrateQuery.refetch()} />}
          {bitrateQuery.isSuccess && bitrateQuery.data.data.length === 0 && (
            <EmptyState title="Keine Daten" description="Noch keine Bitrate-Daten vorhanden." />
          )}
          {bitrateQuery.isSuccess && bitrateQuery.data.data.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bitrateQuery.data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="channelName" tick={{ fill: '#8e99aa', fontSize: 12 }} />
                <YAxis tick={{ fill: '#8e99aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', color: '#f7f9fc' }}
                  formatter={(value: number) => [`${Math.round(value)} kbps`, '']}
                />
                <Bar dataKey="avgBitrateKbps" name="Ø Bitrate" fill="#20d9ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Incident History */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Historie</CardEyebrow>
            <CardTitle>Incidents</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {incidentsQuery.isLoading && <div className="h-32 animate-pulse rounded-lg bg-surface-elevated" />}
          {incidentsQuery.isError && <ErrorState onRetry={() => incidentsQuery.refetch()} />}
          {incidentsQuery.isSuccess && incidentsQuery.data.data.length === 0 && (
            <EmptyState title="Keine Incidents" description="Es liegen keine Störungen für diesen Sender vor." />
          )}
          {incidentsQuery.isSuccess && incidentsQuery.data.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Fehlercode</th>
                    <th className="px-3 py-2">Gestartet</th>
                    <th className="px-3 py-2">Gelöst</th>
                    <th className="px-3 py-2">Fehlschl.</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentsQuery.data.data.map((inc) => (
                    <tr key={inc.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Badge tone={inc.status === 'open' ? 'danger' : 'success'}>
                          {inc.status === 'open' ? 'Offen' : 'Gelöst'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {inc.errorCode ? (
                          <Badge tone="warning">{inc.errorCode}</Badge>
                        ) : (
                          <span className="text-text-subtle">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{formatDate(inc.startedAt)}</td>
                      <td className="px-3 py-2 text-text-muted">
                        {inc.resolvedAt ? formatDate(inc.resolvedAt) : '—'}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{inc.failedChecks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Details</CardEyebrow>
            <CardTitle>Technische Informationen</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-text-subtle">Normalisierter Name</dt>
              <dd className="text-vhv-text">{channel.normalizedName}</dd>
            </div>
            <div>
              <dt className="text-text-subtle">Provider</dt>
              <dd className="text-vhv-text">{channel.providerId}</dd>
            </div>
            <div>
              <dt className="text-text-subtle">Kategorie</dt>
              <dd className="text-vhv-text">{channel.categoryId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-subtle">Priorität</dt>
              <dd className="text-vhv-text">{PRIORITY_LABELS[channel.priority] ?? channel.priority}</dd>
            </div>
            <div>
              <dt className="text-text-subtle">Erstellt am</dt>
              <dd className="text-vhv-text">{formatDate(channel.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-text-subtle">Aktualisiert am</dt>
              <dd className="text-vhv-text">{formatDate(channel.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
