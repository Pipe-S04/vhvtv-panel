import type { HTMLAttributes } from 'react';
import type { VhvStatus } from '../tokens.js';

const labels: Record<VhvStatus, string> = {
  online: 'Online',
  degraded: 'Gestört',
  offline: 'Offline',
  unknown: 'Unbekannt',
  paused: 'Pausiert'
};

export type StatusProps = HTMLAttributes<HTMLSpanElement> & {
  status: VhvStatus;
  label?: string;
};

export function Status({ status, label = labels[status], className, ...props }: StatusProps) {
  const classes = ['vhv-status', `vhv-status--${status}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} data-status={status} {...props}>
      <span className="vhv-status__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
