import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-linear-to-br from-[rgba(17,22,32,0.78)] to-[rgba(10,12,18,0.88)]',
        'shadow-[0_20px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 px-6 pt-6 pb-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardEyebrow({ className, children, ...props }: CardProps) {
  return (
    <p
      className={cn(
        'mb-1 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-cyan',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3
      className={cn('text-lg leading-tight font-semibold text-vhv-text', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}
