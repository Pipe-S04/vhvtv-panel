import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'gold' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children: ReactNode;
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  gold: 'bg-primary/14 text-primary-light border-primary-light/30',
  neutral: 'bg-text-muted/13 text-[#c5cad4] border-text-muted/30',
  success: 'bg-status-online/13 text-status-online border-status-online/30',
  warning: 'bg-status-degraded/14 text-status-degraded border-status-degraded/30',
  danger: 'bg-status-offline/13 text-status-offline border-status-offline/30',
  info: 'bg-[rgba(90,167,255,0.13)] text-[#93c6ff] border-[#93c6ff]/30',
};

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
