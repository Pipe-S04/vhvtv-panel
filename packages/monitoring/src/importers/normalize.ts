import type { DuplicateReport, ImportCategory, ImportChannel, ImportPayload } from './types.js';

type RawCategory = Partial<ImportCategory> | { externalId?: unknown; name?: unknown };
type RawChannel =
  | Partial<ImportChannel>
  | {
      externalStreamId?: unknown;
      name?: unknown;
      categoryExternalId?: unknown;
      categoryName?: unknown;
      logoPath?: unknown;
      streamUrl?: unknown;
    };

export interface RawImportPayload {
  categories: RawCategory[];
  channels: RawChannel[];
}

const SPACE_PATTERN = /\s+/g;

function stripControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('');
}

export function normalizeName(name: string): string {
  return stripControlCharacters(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(SPACE_PATTERN, ' ')
    .toLowerCase();
}

export function cleanText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const cleaned = String(value)
    .replace(stripControlCharacters(''), '')
    .trim()
    .replace(SPACE_PATTERN, ' ');
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeCategory(input: {
  externalId?: unknown;
  name?: unknown;
}): ImportCategory | null {
  const name = cleanText(input.name);
  if (!name) return null;
  return { externalId: cleanText(input.externalId), name };
}

export function normalizeChannel(input: {
  externalStreamId?: unknown;
  name?: unknown;
  categoryExternalId?: unknown;
  categoryName?: unknown;
  logoPath?: unknown;
  streamUrl?: unknown;
}): ImportChannel | null {
  const name = cleanText(input.name);
  if (!name) return null;
  return {
    externalStreamId: cleanText(input.externalStreamId),
    name,
    normalizedName: normalizeName(name),
    categoryExternalId: cleanText(input.categoryExternalId),
    categoryName: cleanText(input.categoryName),
    logoPath: cleanText(input.logoPath),
    streamUrl: cleanText(input.streamUrl)
  };
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectDuplicates(channels: ImportChannel[]): DuplicateReport {
  const externalCounts = new Map<string, number>();
  const normalizedCounts = new Map<string, number>();
  for (const channel of channels) {
    if (channel.externalStreamId) {
      externalCounts.set(
        channel.externalStreamId,
        (externalCounts.get(channel.externalStreamId) ?? 0) + 1
      );
    }
    normalizedCounts.set(
      channel.normalizedName,
      (normalizedCounts.get(channel.normalizedName) ?? 0) + 1
    );
  }
  return {
    externalStreamIds: [...externalCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
    normalizedNames: [...normalizedCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  };
}

export function normalizePayload(payload: RawImportPayload): ImportPayload {
  const categories = uniqueBy(
    payload.categories
      .map((category) => normalizeCategory(category))
      .filter((category): category is ImportCategory => category !== null),
    (category) => category.externalId ?? `name:${normalizeName(category.name)}`
  );
  const channels = uniqueBy(
    payload.channels
      .map((channel) => normalizeChannel(channel))
      .filter((channel): channel is ImportChannel => channel !== null),
    (channel) => channel.externalStreamId ?? `name:${channel.normalizedName}`
  );
  return { categories, channels };
}
