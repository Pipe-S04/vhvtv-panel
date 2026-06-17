'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderTree } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardEyebrow, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export default function KategorienPage() {
  const [page, setPage] = useState(1);

  const categoriesQuery = useQuery({
    queryKey: ['categories', page],
    queryFn: () => api.getCategories({ page, limit: 24 }),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vhv-text">Kategorien</h1>
        <p className="mt-1 text-sm text-text-muted">
          Senderkategorien verwalten
        </p>
      </div>

      {categoriesQuery.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {categoriesQuery.isError && (
        <ErrorState onRetry={() => categoriesQuery.refetch()} />
      )}

      {categoriesQuery.isSuccess && categoriesQuery.data.data.length === 0 && (
        <Card>
          <EmptyState
            icon={<FolderTree size={40} />}
            title="Keine Kategorien vorhanden"
            description="Importieren Sie einen Provider, um Kategorien zu erstellen."
          />
        </Card>
      )}

      {categoriesQuery.isSuccess && categoriesQuery.data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoriesQuery.data.data.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={categoriesQuery.data.pagination.totalPages}
            total={categoriesQuery.data.pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: { id: string; providerId: string; externalId: string | null; name: string; createdAt: string } }) {
  const detailQuery = useQuery({
    queryKey: ['category', category.id],
    queryFn: () => api.getCategory(category.id),
  });

  return (
    <Card>
      <CardContent>
        <CardEyebrow>Kategorie</CardEyebrow>
        <CardTitle>{category.name}</CardTitle>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Sender</span>
            <Badge tone="gold">
              {detailQuery.data?.channelCount ?? '...'}
            </Badge>
          </div>
          {category.externalId && (
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Externe ID</span>
              <span className="text-text-subtle">{category.externalId}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Erstellt</span>
            <span className="text-text-subtle">{formatDate(category.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
