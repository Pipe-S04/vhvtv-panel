'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = 'Fehler aufgetreten',
  message = 'Die Daten konnten nicht geladen werden. Bitte versuchen Sie es erneut.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 text-ruby">
        <AlertTriangle size={40} />
      </div>
      <h3 className="text-lg font-semibold text-vhv-text">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-text-muted">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            Erneut versuchen
          </Button>
        </div>
      )}
    </div>
  );
}
