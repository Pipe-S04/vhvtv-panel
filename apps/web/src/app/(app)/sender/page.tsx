'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { Radio, Search, Play, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ChannelDto } from '@/lib/api-types';
import { formatDateShort } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusDot } from '@/components/ui/status-dot';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonTable } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

const columnHelper = createColumnHelper<ChannelDto>();

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

export default function SenderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [monitorFilter, setMonitorFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, providerFilter, categoryFilter, priorityFilter, monitorFilter]);

  const filtersActive = !!(debouncedSearch || statusFilter || providerFilter || categoryFilter || priorityFilter || monitorFilter);

  const channelsQuery = useQuery({
    queryKey: ['channels', page, debouncedSearch, statusFilter, providerFilter, categoryFilter, priorityFilter, monitorFilter],
    queryFn: () =>
      api.getChannels({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        providerId: providerFilter || undefined,
        categoryId: categoryFilter || undefined,
        monitorEnabled: monitorFilter === '' ? undefined : monitorFilter === 'true',
      }),
  });

  const providersQuery = useQuery({
    queryKey: ['providers-filter'],
    queryFn: () => api.getProviders({ limit: 100 }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories-filter'],
    queryFn: () => api.getCategories({ limit: 100 }),
  });

  const triggerCheckMutation = useMutation({
    mutationFn: (channelId: string) => api.triggerCheck(channelId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });

  const bulkMonitorMutation = useMutation({
    mutationFn: ({ ids, enabled }: { ids: string[]; enabled: boolean }) =>
      api.bulkMonitor(ids, enabled),
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const toggleMonitorMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateChannel(id, { monitorEnabled: enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        size: 40,
        header: () => {
          const allIds = channelsQuery.data?.data.map((c) => c.id) ?? [];
          const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
          return (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(new Set([...selectedIds, ...allIds]));
                } else {
                  const next = new Set(selectedIds);
                  allIds.forEach((id) => next.delete(id));
                  setSelectedIds(next);
                }
              }}
              className="accent-primary"
            />
          );
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={(e) => {
              e.stopPropagation();
              const next = new Set(selectedIds);
              if (e.target.checked) next.add(row.original.id);
              else next.delete(row.original.id);
              setSelectedIds(next);
            }}
            onClick={(e) => e.stopPropagation()}
            className="accent-primary"
          />
        ),
      }),
      columnHelper.accessor('currentStatus', {
        header: 'Status',
        size: 80,
        cell: (info) => <StatusDot status={info.getValue()} showLabel />,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('priority', {
        header: 'Priorität',
        size: 120,
        cell: (info) => {
          const val = info.getValue();
          return (
            <Badge tone={PRIORITY_TONES[val] ?? 'neutral'}>
              {PRIORITY_LABELS[val] ?? val}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('monitorEnabled', {
        header: 'Monitoring',
        size: 100,
        cell: (info) =>
          info.getValue() ? (
            <Badge tone="success">Aktiv</Badge>
          ) : (
            <Badge tone="neutral">Inaktiv</Badge>
          ),
      }),
      columnHelper.accessor('checkIntervalMinutes', {
        header: 'Intervall',
        size: 90,
        cell: (info) => <span className="text-text-muted">{info.getValue()} Min.</span>,
      }),
      columnHelper.accessor('lastCheckAt', {
        header: 'Letzter Check',
        size: 130,
        cell: (info) => (
          <span className="text-text-muted">{formatDateShort(info.getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        size: 180,
        cell: ({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerCheckMutation.mutate(row.original.id)}
              disabled={triggerCheckMutation.isPending}
            >
              <Play size={14} />
              Prüfen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toggleMonitorMutation.mutate({
                  id: row.original.id,
                  enabled: !row.original.monitorEnabled,
                })
              }
              disabled={toggleMonitorMutation.isPending}
            >
              {row.original.monitorEnabled ? 'Aus' : 'An'}
            </Button>
          </div>
        ),
      }),
    ],
    [channelsQuery.data, selectedIds, triggerCheckMutation, toggleMonitorMutation],
  );

  const table = useReactTable({
    data: channelsQuery.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setProviderFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setMonitorFilter('');
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vhv-text">Sender</h1>
        <p className="mt-1 text-sm text-text-muted">
          IPTV-Sender verwalten und überwachen
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
                <Input
                  placeholder="Sender suchen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X size={14} />
                Filter zurücksetzen
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Status: Alle</option>
              <option value="online">Online</option>
              <option value="degraded">Gestört</option>
              <option value="offline">Offline</option>
              <option value="unknown">Unbekannt</option>
              <option value="paused">Pausiert</option>
            </Select>
            <Select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
              <option value="">Provider: Alle</option>
              {providersQuery.data?.data.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Kategorie: Alle</option>
              {categoriesQuery.data?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">Priorität: Alle</option>
              <option value="critical">Kritisch</option>
              <option value="reference">Referenz</option>
              <option value="manual">Manuell</option>
              <option value="retry">Wiederholung</option>
            </Select>
            <Select value={monitorFilter} onChange={(e) => setMonitorFilter(e.target.value)}>
              <option value="">Monitoring: Alle</option>
              <option value="true">Überwacht</option>
              <option value="false">Nicht überwacht</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="mb-4">
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-muted">
                {selectedIds.size} Sender ausgewählt
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  bulkMonitorMutation.mutate({ ids: [...selectedIds], enabled: true })
                }
                disabled={bulkMonitorMutation.isPending}
              >
                Monitoring aktivieren
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  bulkMonitorMutation.mutate({ ids: [...selectedIds], enabled: false })
                }
                disabled={bulkMonitorMutation.isPending}
              >
                Monitoring deaktivieren
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Auswahl aufheben
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {channelsQuery.isLoading && <SkeletonTable rows={10} />}
      {channelsQuery.isError && (
        <ErrorState onRetry={() => channelsQuery.refetch()} />
      )}
      {channelsQuery.isSuccess && channelsQuery.data.data.length === 0 && (
        <Card>
          <EmptyState
            icon={<Radio size={40} />}
            title="Keine Sender gefunden"
            description={filtersActive ? 'Versuchen Sie andere Filtereinstellungen.' : 'Es sind noch keine Sender vorhanden.'}
          />
        </Card>
      )}
      {channelsQuery.isSuccess && channelsQuery.data.data.length > 0 && (
        <>
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/sender/${row.id}`)}
          />
          <Pagination
            page={page}
            totalPages={channelsQuery.data.pagination.totalPages}
            total={channelsQuery.data.pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
