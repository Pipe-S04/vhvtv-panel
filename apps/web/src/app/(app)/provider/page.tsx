'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, Plus, Trash2, TestTube, Download, Pencil } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ProviderDto } from '@/lib/api-types';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardEyebrow, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

type ProviderFormData = {
  name: string;
  type: string;
  baseUrl: string;
  username: string;
  password: string;
  enabled: boolean;
};

const EMPTY_FORM: ProviderFormData = {
  name: '',
  type: 'xtream',
  baseUrl: '',
  username: '',
  password: '',
  enabled: true,
};

export default function ProviderPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderFormData>(EMPTY_FORM);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; statusCode: number | null }>>({});

  const providersQuery = useQuery({
    queryKey: ['providers', page],
    queryFn: () => api.getProviders({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: ProviderFormData) =>
      api.createProvider({
        name: data.name,
        type: data.type,
        baseUrl: data.baseUrl,
        username: data.username || undefined,
        password: data.password || undefined,
        enabled: data.enabled,
      } as Parameters<typeof api.createProvider>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProviderFormData }) =>
      api.updateProvider(id, {
        name: data.name,
        baseUrl: data.baseUrl,
        enabled: data.enabled,
        ...(data.username ? { username: data.username } : {}),
        ...(data.password ? { password: data.password } : {}),
      } as Parameters<typeof api.updateProvider>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testProvider(id),
    onSuccess: (data, id) => {
      setTestResults((prev) => ({ ...prev, [id]: data }));
    },
  });

  const importMutation = useMutation({
    mutationFn: (id: string) => api.importProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  function resetForm() {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditId(null);
  }

  function startEdit(provider: ProviderDto) {
    setForm({
      name: provider.name,
      type: provider.type,
      baseUrl: '',
      username: '',
      password: '',
      enabled: provider.enabled,
    });
    setEditId(provider.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleDelete(id: string) {
    if (window.confirm('Möchten Sie diesen Provider wirklich löschen? Alle zugehörigen Sender werden ebenfalls gelöscht.')) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vhv-text">Provider</h1>
          <p className="mt-1 text-sm text-text-muted">
            IPTV-Provider verwalten
          </p>
        </div>
        {!showForm && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Neuer Provider
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div>
              <CardEyebrow>{editId ? 'Bearbeiten' : 'Neu'}</CardEyebrow>
              <CardTitle>{editId ? 'Provider bearbeiten' : 'Neuen Provider anlegen'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mein Provider"
              />
              <Select
                label="Typ"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                disabled={!!editId}
              >
                <option value="xtream">Xtream Codes</option>
                <option value="m3u">M3U</option>
              </Select>
              <Input
                label="Base URL"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://example.com"
              />
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-text-muted">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    className="accent-primary"
                  />
                  Aktiviert
                </label>
              </div>
              <Input
                label="Benutzername"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={editId ? '(unverändert lassen)' : 'Optional'}
              />
              <Input
                label="Passwort"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editId ? '••••••••' : 'Optional'}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!form.name || (!editId && !form.baseUrl) || createMutation.isPending || updateMutation.isPending}
              >
                {editId ? 'Speichern' : 'Erstellen'}
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider List */}
      {providersQuery.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {providersQuery.isError && <ErrorState onRetry={() => providersQuery.refetch()} />}

      {providersQuery.isSuccess && providersQuery.data.data.length === 0 && (
        <Card>
          <EmptyState
            icon={<Server size={40} />}
            title="Keine Provider"
            description="Erstellen Sie einen Provider, um Sender zu importieren."
            action={
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Plus size={16} />
                Ersten Provider anlegen
              </Button>
            }
          />
        </Card>
      )}

      {providersQuery.isSuccess && providersQuery.data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {providersQuery.data.data.map((provider) => (
              <Card key={provider.id}>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardEyebrow>Provider</CardEyebrow>
                      <CardTitle>{provider.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={provider.type === 'xtream' ? 'gold' : 'info'}>
                        {provider.type === 'xtream' ? 'Xtream Codes' : 'M3U'}
                      </Badge>
                      <Badge tone={provider.enabled ? 'success' : 'neutral'}>
                        {provider.enabled ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Zugangsdaten</span>
                      <Badge tone={provider.hasCredentials ? 'success' : 'neutral'}>
                        {provider.hasCredentials ? 'Hinterlegt' : 'Keine'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Erstellt</span>
                      <span className="text-text-subtle">{formatDate(provider.createdAt)}</span>
                    </div>
                  </div>

                  {/* Test Result */}
                  {testResults[provider.id] && (
                    <div className="mt-3">
                      <Badge tone={testResults[provider.id]!.success ? 'success' : 'danger'}>
                        {testResults[provider.id]!.success
                          ? `Verbindung OK (${testResults[provider.id]!.statusCode})`
                          : `Fehler${testResults[provider.id]!.statusCode ? ` (${testResults[provider.id]!.statusCode})` : ''}`}
                      </Badge>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testMutation.mutate(provider.id)}
                      disabled={testMutation.isPending}
                    >
                      <TestTube size={14} />
                      Testen
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => importMutation.mutate(provider.id)}
                      disabled={importMutation.isPending}
                    >
                      <Download size={14} />
                      Importieren
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(provider)}>
                      <Pencil size={14} />
                      Bearbeiten
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(provider.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={14} />
                      Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={providersQuery.data.pagination.totalPages}
            total={providersQuery.data.pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
