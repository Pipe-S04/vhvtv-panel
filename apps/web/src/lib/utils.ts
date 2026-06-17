import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx for conditional class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date string to a human-readable German locale date/time.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format an ISO date string to a short relative or absolute time.
 */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();

  if (diffMs < 60_000) return 'gerade eben';
  if (diffMs < 3_600_000) return `vor ${Math.floor(diffMs / 60_000)} Min.`;
  if (diffMs < 86_400_000) return `vor ${Math.floor(diffMs / 3_600_000)} Std.`;

  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Format a number with locale-aware formatting.
 */
export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—';
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage value.
 */
export function formatPercent(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—';
  return `${n.toFixed(decimals)} %`;
}

/**
 * Status color mapping -- returns Tailwind class names.
 */
export type StatusKey = 'online' | 'degraded' | 'offline' | 'unknown' | 'paused';

const STATUS_COLORS: Record<StatusKey, { text: string; bg: string; dot: string }> = {
  online: {
    text: 'text-status-online',
    bg: 'bg-status-online/15',
    dot: 'bg-status-online shadow-[0_0_18px_var(--color-status-online)]',
  },
  degraded: {
    text: 'text-status-degraded',
    bg: 'bg-status-degraded/15',
    dot: 'bg-status-degraded shadow-[0_0_18px_var(--color-status-degraded)]',
  },
  offline: {
    text: 'text-status-offline',
    bg: 'bg-status-offline/15',
    dot: 'bg-status-offline shadow-[0_0_18px_var(--color-status-offline)]',
  },
  unknown: {
    text: 'text-status-unknown',
    bg: 'bg-status-unknown/15',
    dot: 'bg-status-unknown shadow-[0_0_18px_var(--color-status-unknown)]',
  },
  paused: {
    text: 'text-status-paused',
    bg: 'bg-status-paused/15',
    dot: 'bg-status-paused shadow-[0_0_18px_var(--color-status-paused)]',
  },
};

export function getStatusColors(status: string) {
  const key = status.toLowerCase() as StatusKey;
  return STATUS_COLORS[key] ?? STATUS_COLORS.unknown;
}

/**
 * Status display label in German.
 */
const STATUS_LABELS: Record<StatusKey, string> = {
  online: 'Online',
  degraded: 'Eingeschränkt',
  offline: 'Offline',
  unknown: 'Unbekannt',
  paused: 'Pausiert',
};

export function getStatusLabel(status: string): string {
  const key = status.toLowerCase() as StatusKey;
  return STATUS_LABELS[key] ?? status;
}
