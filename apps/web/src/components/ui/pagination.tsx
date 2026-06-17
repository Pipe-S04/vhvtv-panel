'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({ page, totalPages, total, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center justify-between gap-4 pt-4', className)}>
      <p className="text-sm text-text-muted">
        Seite {page} von {totalPages} ({total} Einträge)
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Vorherige Seite"
        >
          <ChevronLeft size={16} />
        </Button>

        {generatePageNumbers(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`ellipsis-${i}`} className="px-1 text-text-subtle">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(p)}
              className="min-w-[2rem]"
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Nächste Seite"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [1];

  if (current > 3) pages.push(null);

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push(null);
  pages.push(total);

  return pages;
}
