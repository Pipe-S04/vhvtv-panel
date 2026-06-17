'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { api } from '@/lib/api-client';
import { formatDuration, formatPercent } from '@/lib/utils';
import { Card, CardContent, CardEyebrow, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '48h', hours: 48 },
  { label: '1 Woche', hours: 168 },
  { label: '30 Tage', hours: 720 },
];

function availabilityColor(pct: number): string {
  if (pct >= 99) return '#22c787';
  if (pct >= 95) return '#f5b942';
  return '#ff5263';
}

function startupColor(ms: number): string {
  if (ms < 2000) return '#22c787';
  if (ms < 5000) return '#f5b942';
  return '#ff5263';
}

const TOOLTIP_STYLE = {
  backgroundColor: '#111620',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.75rem',
  color: '#f7f9fc',
};

export default function StatistikenPage() {
  const [hours, setHours] = useState(24);

  const availabilityQuery = useQuery({
    queryKey: ['stats-availability', hours],
    queryFn: () => api.getAvailabilityStats({ hours }),
  });

  const startupQuery = useQuery({
    queryKey: ['stats-startup', hours],
    queryFn: () => api.getStartupTimeStats({ hours }),
  });

  const bitrateQuery = useQuery({
    queryKey: ['stats-bitrate', hours],
    queryFn: () => api.getBitrateStats({ hours }),
  });

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vhv-text">Statistiken</h1>
        <p className="mt-1 text-sm text-text-muted">
          Performance-Metriken und Trends
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-2">
        {TIME_RANGES.map((r) => (
          <Button
            key={r.hours}
            variant={hours === r.hours ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setHours(r.hours)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Availability Chart */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Verfügbarkeit</CardEyebrow>
            <CardTitle>Senderverfügbarkeit (niedrigste zuerst)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {availabilityQuery.isLoading && <SkeletonCard />}
          {availabilityQuery.isError && <ErrorState onRetry={() => availabilityQuery.refetch()} />}
          {availabilityQuery.isSuccess && availabilityQuery.data.data.length === 0 && (
            <EmptyState title="Keine Daten" description="Im gewählten Zeitraum liegen keine Verfügbarkeitsdaten vor." />
          )}
          {availabilityQuery.isSuccess && availabilityQuery.data.data.length > 0 && (
            <ResponsiveContainer width="100%" height={Math.max(200, availabilityQuery.data.data.length * 32)}>
              <BarChart data={availabilityQuery.data.data} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#8e99aa', fontSize: 12 }} />
                <YAxis type="category" dataKey="channelName" tick={{ fill: '#8e99aa', fontSize: 12 }} width={110} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [formatPercent(value), 'Verfügbarkeit']}
                />
                <Bar dataKey="availabilityPercent" radius={[0, 4, 4, 0]}>
                  {availabilityQuery.data.data.map((entry, idx) => (
                    <Cell key={idx} fill={availabilityColor(entry.availabilityPercent)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Startup Times Chart */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Startzeiten</CardEyebrow>
            <CardTitle>Durchschnittliche Startzeiten pro Sender</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {startupQuery.isLoading && <SkeletonCard />}
          {startupQuery.isError && <ErrorState onRetry={() => startupQuery.refetch()} />}
          {startupQuery.isSuccess && startupQuery.data.data.length === 0 && (
            <EmptyState title="Keine Daten" description="Im gewählten Zeitraum liegen keine Startzeitdaten vor." />
          )}
          {startupQuery.isSuccess && startupQuery.data.data.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={startupQuery.data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="channelName" tick={{ fill: '#8e99aa', fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fill: '#8e99aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [
                    formatDuration(value),
                    name === 'avgStartupMs' ? 'Ø Startzeit' : name === 'maxStartupMs' ? 'Max' : 'Min',
                  ]}
                />
                <Bar dataKey="avgStartupMs" name="avgStartupMs" radius={[4, 4, 0, 0]}>
                  {startupQuery.data.data.map((entry, idx) => (
                    <Cell key={idx} fill={startupColor(entry.avgStartupMs)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bitrate Chart */}
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Bitraten</CardEyebrow>
            <CardTitle>Durchschnittliche Bitrate pro Sender</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {bitrateQuery.isLoading && <SkeletonCard />}
          {bitrateQuery.isError && <ErrorState onRetry={() => bitrateQuery.refetch()} />}
          {bitrateQuery.isSuccess && bitrateQuery.data.data.length === 0 && (
            <EmptyState title="Keine Daten" description="Im gewählten Zeitraum liegen keine Bitrate-Daten vor." />
          )}
          {bitrateQuery.isSuccess && bitrateQuery.data.data.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bitrateQuery.data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="channelName" tick={{ fill: '#8e99aa', fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fill: '#8e99aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [`${Math.round(value)} kbps`, 'Ø Bitrate']}
                />
                <Bar dataKey="avgBitrateKbps" name="Ø Bitrate" fill="#20d9ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
