import type { HTMLAttributes } from 'react';

export type BadgeTone = 'gold' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = 'gold', className, ...props }: BadgeProps) {
  const classes = ['vhv-badge', `vhv-badge--${tone}`, className].filter(Boolean).join(' ');

  return <span className={classes} {...props} />;
}
