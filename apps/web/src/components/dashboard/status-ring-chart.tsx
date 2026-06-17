'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { DashboardDto } from '@/lib/api-types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardEyebrow, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_CHART_COLORS: Record<string, string> = {
  online: '#22c787',
  degraded: '#f5b942',
  offline: '#ff5263',
  unknown: '#8e99aa',
};

export function StatusRingChart({ data }: { data: DashboardDto }) {
  const segments = [
    { name: 'Online', value: data.online, color: STATUS_CHART_COLORS.online },
    { name: 'Gestört', value: data.degraded, color: STATUS_CHART_COLORS.degraded },
    { name: 'Offline', value: data.offline, color: STATUS_CHART_COLORS.offline },
    { name: 'Unbekannt', value: data.unknown, color: STATUS_CHART_COLORS.unknown },
  ].filter((s) => s.value > 0);

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
                {segments.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
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
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-extrabold text-vhv-text">
              {data.monitoredChannels}
            </span>
            <span className="text-xs text-text-muted">Sender</span>
          </div>
        </div>
      </CardContent>
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
