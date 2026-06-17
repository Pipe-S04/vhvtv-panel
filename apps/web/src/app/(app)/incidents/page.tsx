'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { IncidentDto } from '@/lib/api-types';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonTable } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

const columnHelper = createColumnHelper<IncidentDto>();

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const incidentsQuery = useQuery({
    queryKey: ['incidents', page, statusFilter],
    queryFn: () =>
      api.getIncidents({
        page,
        limit: 20,
        status: statusFilter || undefined,
      }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.acknowledgeIncident(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
  });

  const columns = [
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => (
        <Badge tone={info.getValue() === 'open' ? 'danger' : 'success'}>
          {info.getValue() === 'open' ? 'Offen' : 'Gelöst'}
        </Badge>
      ),
    }),
    columnHelper.accessor('channelName', {
      header: 'Sender',
      cell: (info) => (
        <Link
          href={`/sender/${info.row.original.channelId}`}
          className="font-medium text-primary-light hover:text-cyan transition-colors no-underline"
          onClick={(e) => e.stopPropagation()}
        >
          {info.getValue() ?? info.row.original.channelId}
        </Link>
      ),
    }),
    columnHelper.accessor('errorCode', {
      header: 'Fehlercode',
      size: 150,
      cell: (info) =>
        info.getValue() ? (
          <Badge tone="warning">{info.getValue()}</Badge>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    }),
    columnHelper.accessor('startedAt', {
      header: 'Gestartet',
      size: 160,
      cell: (info) => (
        <span className="text-text-muted">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('resolvedAt', {
      header: 'Gelöst',
      size: 160,
      cell: (info) => (
        <span className="text-text-muted">
          {info.getValue() ? formatDate(info.getValue()!) : '—'}
        </span>
      ),
    }),
    columnHelper.accessor('failedChecks', {
      header: 'Fehlschl.',
      size: 100,
      cell: (info) => <span className="text-text-muted">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Aktionen',
      size: 120,
      cell: ({ row }) =>
        row.original.status === 'open' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              acknowledgeMutation.mutate(row.original.id);
            }}
            disabled={acknowledgeMutation.isPending}
          >
            Bestätigen
          </Button>
        ) : null,
    }),
  ];

  const table = useReactTable({
    data: incidentsQuery.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vhv-text">Incidents</h1>
        <p className="mt-1 text-sm text-text-muted">
          Störungen und Ausfälle verwalten
        </p>
      </div>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="w-48">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle</option>
                <option value="open">Offen</option>
                <option value="resolved">Gelöst</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {incidentsQuery.isLoading && <SkeletonTable rows={8} />}
      {incidentsQuery.isError && <ErrorState onRetry={() => incidentsQuery.refetch()} />}
      {incidentsQuery.isSuccess && incidentsQuery.data.data.length === 0 && (
        <Card>
          <EmptyState
            icon={<AlertTriangle size={40} />}
            title="Keine Incidents"
            description="Es liegen keine Störungen vor."
          />
        </Card>
      )}
      {incidentsQuery.isSuccess && incidentsQuery.data.data.length > 0 && (
        <>
          <DataTable table={table} />
          <Pagination
            page={page}
            totalPages={incidentsQuery.data.pagination.totalPages}
            total={incidentsQuery.data.pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
