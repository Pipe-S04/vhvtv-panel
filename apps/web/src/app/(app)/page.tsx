'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Clock,
  Monitor,
  Radio,
  Tv,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { api } from '@/lib/api-client';
import type { DashboardDto, IncidentDto, CheckDto, ChannelDto } from '@/lib/api-types';
import {
  cn,
  formatDateShort,
  formatDuration,
  formatNumber,
  formatPercent,
} from '@/lib/utils';
import { Card, CardContent, CardEyebrow, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-dot';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CHART_COLORS: Record<string, string> = {
  online: '#22c787',
  degraded: '#f5b942',
  offline: '#ff5263',
  unknown: '#8e99aa',
};

const CHECK_STATUS_TONE: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  success: 'success',
  failed: 'danger',
  timeout: 'warning',
  error: 'danger',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  eyebrow,
  value,
  icon,
  valueClassName,
  children,
}: {
  eyebrow: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardEyebrow>{eyebrow}</CardEyebrow>
          <span className="text-text-subtle">{icon}</span>
        </div>
        <p className={cn('text-3xl font-extrabold tracking-tight text-vhv-text', valueClassName)}>
          {value}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

function KpiCardsRow({ data }: { data: DashboardDto }) {
  const availColor =
    data.availability24h >= 99 ? 'text-emerald' : data.availability24h >= 95 ? 'text-amber' : 'text-ruby';
  const startupColor =
    data.averageStartupMs < 2000
      ? 'text-emerald'
      : data.averageStartupMs < 5000
        ? 'text-amber'
        : 'text-ruby';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Monitored channels */}
      <KpiCard
        eyebrow="Überwachte Sender"
        value={formatNumber(data.monitoredChannels)}
        icon={<Tv size={18} />}
      >
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-status-online" />
            {data.online}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-status-degraded" />
            {data.degraded}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-status-offline" />
            {data.offline}
          </span>
        </div>
      </KpiCard>

      {/* Availability */}
      <KpiCard
        eyebrow="Verfügbarkeit 24h"
        value={formatPercent(data.availability24h)}
        icon={<Activity size={18} />}
        valueClassName={availColor}
      />

      {/* Startup time */}
      <KpiCard
        eyebrow="Ø Startzeit"
        value={formatDuration(data.averageStartupMs)}
        icon={<Zap size={18} />}
        valueClassName={startupColor}
      />

      {/* Active incidents */}
      <KpiCard
        eyebrow="Aktive Incidents"
        value={formatNumber(data.activeIncidents)}
        icon={<AlertTriangle size={18} />}
        valueClassName={data.activeIncidents > 0 ? 'text-ruby' : undefined}
      />
    </div>
  );
}

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Ring Chart
// ---------------------------------------------------------------------------

function StatusRingChart({ data }: { data: DashboardDto }) {
  const segments = [
    { name: 'Online', value: data.online, color: STATUS_CHART_COLORS.online },
    { name: 'Gestört', value: data.degraded, color: STATUS_CHART_COLORS.degraded },
    { name: 'Offline', value: data.offline, color: STATUS_CHART_COLORS.offline },
    { name: 'Unbekannt', value: data.unknown, color: STATUS_CHART_COLORS.unknown },
  ].filter((s) => s.value > 0);

  // If all zeros, show a placeholder ring
  if (segments.length === 0) {
    segments.push({ name: 'Keine Daten', value: 1, color: '#2a2f3a' });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardEyebrow>Statusverteilung</CardEyebrow>
          <CardTitle>Sender-Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div className="relative h-60 w-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {segments.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111620',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.75rem',
                  color: '#f7f9fc',
                  fontSize: '0.8rem',
                }}
                formatter={(value: number, name: string) => [`${value} Sender`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-extrabold text-vhv-text">
              {data.monitoredChannels}
            </span>
            <span className="text-xs text-text-muted">Sender</span>
          </div>
        </div>
      </CardContent>
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 px-6 pb-6 text-xs text-text-muted">
        {[
          { label: 'Online', color: 'bg-status-online', count: data.online },
          { label: 'Gestört', color: 'bg-status-degraded', count: data.degraded },
          { label: 'Offline', color: 'bg-status-offline', count: data.offline },
          { label: 'Unbekannt', color: 'bg-status-unknown', count: data.unknown },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-full', item.color)} />
            {item.label} ({item.count})
          </span>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active Incidents
// ---------------------------------------------------------------------------

function ActiveIncidentsList({ incidents }: { incidents: IncidentDto[] }) {
  if (incidents.length === 0) {
    return (
      <EmptyState
        icon={<Radio size={36} />}
        title="Keine aktiven Incidents"
        description="Alle überwachten Sender funktionieren einwandfrei."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {incidents.slice(0, 10).map((incident) => (
        <div
          key={incident.id}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/sender/${incident.channelId}`}
              className="text-sm font-medium text-vhv-text hover:text-cyan transition-colors truncate block"
            >
              {incident.channelName ?? incident.channelId}
            </Link>
            <span className="text-xs text-text-muted">
              seit {formatDateShort(incident.startedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {incident.errorCode && (
              <Badge tone="danger">{incident.errorCode}</Badge>
            )}
            <span className="text-xs text-text-muted whitespace-nowrap">
              {incident.failedChecks} fehlgeschl.
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problematic Channels
// ---------------------------------------------------------------------------

function ProblematicChannelsList({ channels }: { channels: ChannelDto[] }) {
  if (channels.length === 0) {
    return (
      <EmptyState
        icon={<Monitor size={36} />}
        title="Keine problematischen Sender"
        description="Derzeit gibt es keine Sender mit wiederholten Fehlern."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {channels.map((ch) => (
        <div
          key={ch.id}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <StatusDot status={ch.currentStatus} />
            <Link
              href={`/sender/${ch.id}`}
              className="text-sm font-medium text-vhv-text hover:text-cyan transition-colors truncate"
            >
              {ch.name}
            </Link>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs text-text-muted">
            <span className="text-ruby font-semibold">
              {ch.consecutiveFailures}x fehlgeschl.
            </span>
            <span className="whitespace-nowrap">{formatDateShort(ch.lastCheckAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Checks
// ---------------------------------------------------------------------------

function RecentChecksList({ checks }: { checks: CheckDto[] }) {
  if (checks.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={36} />}
        title="Keine Checks vorhanden"
        description="Es liegen noch keine Prüfergebnisse vor."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {checks.slice(0, 10).map((check) => {
        const tone = CHECK_STATUS_TONE[check.status] ?? 'neutral';
        return (
          <div
            key={check.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Badge tone={tone} className="shrink-0">
                {check.status}
              </Badge>
              <span className="text-xs text-text-muted truncate">
                {formatDateShort(check.checkedAt)}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-xs text-text-muted">
              {check.totalStartupMs != null && (
                <span>
                  <span className="text-text-subtle">Start:</span>{' '}
                  {formatDuration(check.totalStartupMs)}
                </span>
              )}
              {check.averageBitrateKbps != null && (
                <span>
                  <span className="text-text-subtle">Bitrate:</span>{' '}
                  {formatNumber(check.averageBitrateKbps)} kbps
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    refetchInterval: 30_000,
  });

  const incidentsQuery = useQuery({
    queryKey: ['dashboard-incidents'],
    queryFn: () => api.getDashboardIncidents(),
    refetchInterval: 30_000,
  });

  const statusQuery = useQuery({
    queryKey: ['dashboard-status-summary'],
    queryFn: () => api.getStatusSummary(),
    refetchInterval: 30_000,
  });

  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vhv-text">Übersicht</h1>
        <p className="text-sm text-text-muted mt-1">
          Echtzeit-Monitoring aller IPTV-Sender
        </p>
      </div>

      {/* KPI Cards */}
      {isLoading && <KpiCardsSkeleton />}
      {isError && (
        <ErrorState onRetry={() => dashboardQuery.refetch()} />
      )}
      {dashboardQuery.data && <KpiCardsRow data={dashboardQuery.data} />}

      {/* Status Ring + Active Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Status Ring */}
        {dashboardQuery.isLoading ? (
          <SkeletonCard />
        ) : dashboardQuery.isError ? (
          <Card>
            <CardContent>
              <ErrorState onRetry={() => dashboardQuery.refetch()} />
            </CardContent>
          </Card>
        ) : dashboardQuery.data ? (
          <StatusRingChart data={dashboardQuery.data} />
        ) : null}

        {/* Active Incidents */}
        {incidentsQuery.isLoading ? (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Störungen</CardEyebrow>
                <CardTitle>Aktive Incidents</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <SkeletonTable rows={4} />
            </CardContent>
          </Card>
        ) : incidentsQuery.isError ? (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Störungen</CardEyebrow>
                <CardTitle>Aktive Incidents</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ErrorState onRetry={() => incidentsQuery.refetch()} />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardEyebrow>Störungen</CardEyebrow>
                <CardTitle>Aktive Incidents</CardTitle>
              </div>
              {(incidentsQuery.data?.data.length ?? 0) > 0 && (
                <Badge tone="danger">
                  {incidentsQuery.data?.data.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <ActiveIncidentsList incidents={incidentsQuery.data?.data ?? []} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Problematic Channels + Recent Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Problematic Channels */}
        {statusQuery.isLoading ? (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Auffälligkeiten</CardEyebrow>
                <CardTitle>Problematische Sender</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <SkeletonTable rows={4} />
            </CardContent>
          </Card>
        ) : statusQuery.isError ? (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Auffälligkeiten</CardEyebrow>
                <CardTitle>Problematische Sender</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ErrorState onRetry={() => statusQuery.refetch()} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Auffälligkeiten</CardEyebrow>
                <CardTitle>Problematische Sender</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ProblematicChannelsList
                channels={statusQuery.data?.problematicChannels ?? []}
              />
            </CardContent>
          </Card>
        )}

        {/* Recent Checks */}
        {statusQuery.isLoading ? (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Protokoll</CardEyebrow>
                <CardTitle>Letzte Checks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <SkeletonTable rows={4} />
            </CardContent>
          </Card>
        ) : statusQuery.isError ? (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Protokoll</CardEyebrow>
                <CardTitle>Letzte Checks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ErrorState onRetry={() => statusQuery.refetch()} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Protokoll</CardEyebrow>
                <CardTitle>Letzte Checks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <RecentChecksList checks={statusQuery.data?.recentChecks ?? []} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
