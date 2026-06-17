import { createHash } from 'node:crypto';
import { redactString } from '@vhvtv/shared';

import { normalizePayload } from './normalize.js';
import type { ImportPayload, ProviderConnection, ProviderImporter } from './types.js';

const ATTRIBUTE_PATTERN = /([\w-]+)="([^"]*)"/g;
const REMOTE_URL_PATTERN = /^(?:https?|rtmps?|rtsp):\/\//i;

function hashedStreamId(url: string): string {
  return `m3u:${createHash('sha256').update(url).digest('hex').slice(0, 32)}`;
}

function localLogoPath(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || REMOTE_URL_PATTERN.test(trimmed) || trimmed.startsWith('//')) return null;
  return trimmed.startsWith('/') ? trimmed : null;
}

function parseAttributes(line: string): Record<string, string> {
  return Object.fromEntries(
    [...line.matchAll(ATTRIBUTE_PATTERN)].map((match) => [match[1]!, match[2]!])
  );
}

function parseName(line: string): string | null {
  const commaIndex = line.indexOf(',');
  if (commaIndex < 0) return null;
  return line.slice(commaIndex + 1).trim();
}

export function parseM3uPlaylist(playlist: string): ImportPayload {
  const categories = new Map<string, { externalId: string | null; name: string }>();
  const channels = [];
  let pending: Record<string, string> | null = null;
  let pendingName: string | null = null;

  for (const rawLine of playlist.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === '#EXTM3U') continue;
    if (line.startsWith('#EXTINF:')) {
      pending = parseAttributes(line);
      pendingName = parseName(line) ?? pending['tvg-name'] ?? null;
      continue;
    }
    if (line.startsWith('#')) continue;
    if (!pending) continue;

    const categoryName = pending['group-title']?.trim() || null;
    const categoryExternalId = categoryName ? categoryName.toLowerCase() : null;
    if (categoryName)
      categories.set(categoryExternalId!, { externalId: categoryExternalId, name: categoryName });
    channels.push({
      externalStreamId: pending['tvg-id'] ?? hashedStreamId(line),
      name: pendingName ?? pending['tvg-name'],
      categoryExternalId,
      categoryName,
      logoPath: localLogoPath(pending['tvg-logo']),
      streamUrl: null
    });
    pending = null;
    pendingName = null;
  }

  return normalizePayload({ categories: [...categories.values()], channels });
}

export class M3uImporter implements ProviderImporter {
  readonly kind = 'm3u' as const;

  async load(provider: ProviderConnection, signal?: AbortSignal): Promise<ImportPayload> {
    const response = await fetch(provider.baseUrl, signal ? { signal } : undefined);
    if (!response.ok) {
      throw new Error(
        `M3U import request failed: ${response.status} ${redactString(provider.baseUrl)}`
      );
    }
    return parseM3uPlaylist(await response.text());
  }
}
