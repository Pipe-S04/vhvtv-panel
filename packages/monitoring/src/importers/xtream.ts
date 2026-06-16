import { redactString } from '@vhvtv/shared';

import { normalizePayload } from './normalize.js';
import type { ImportPayload, ProviderConnection, ProviderImporter } from './types.js';

type XtreamCategory = { category_id?: string | number; category_name?: string };
type XtreamStream = {
  stream_id?: string | number;
  name?: string;
  category_id?: string | number;
  stream_icon?: string;
};

function buildPlayerApiUrl(provider: ProviderConnection, action: string): URL {
  const url = new URL('/player_api.php', provider.baseUrl);
  url.searchParams.set('action', action);
  if (provider.credentials?.username)
    url.searchParams.set('username', provider.credentials.username);
  if (provider.credentials?.password)
    url.searchParams.set('password', provider.credentials.password);
  return url;
}

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error(
      `Xtream import request failed: ${response.status} ${redactString(url.toString())}`
    );
  }
  return (await response.json()) as T;
}

export class XtreamCodesImporter implements ProviderImporter {
  readonly kind = 'xtream' as const;

  async load(provider: ProviderConnection, signal?: AbortSignal): Promise<ImportPayload> {
    const [rawCategories, rawStreams] = await Promise.all([
      fetchJson<XtreamCategory[]>(buildPlayerApiUrl(provider, 'get_live_categories'), signal),
      fetchJson<XtreamStream[]>(buildPlayerApiUrl(provider, 'get_live_streams'), signal)
    ]);
    const categoryNames = new Map(
      rawCategories.map((category) => [
        String(category.category_id ?? ''),
        category.category_name ?? ''
      ])
    );
    return normalizePayload({
      categories: rawCategories.map((category) => ({
        externalId: category.category_id == null ? null : String(category.category_id),
        name: category.category_name ?? null
      })),
      channels: rawStreams.map((stream) => ({
        externalStreamId: stream.stream_id == null ? null : String(stream.stream_id),
        name: stream.name ?? null,
        categoryExternalId: stream.category_id == null ? null : String(stream.category_id),
        categoryName: categoryNames.get(String(stream.category_id ?? '')) ?? null,
        logoPath: stream.stream_icon ?? null,
        streamUrl: null
      }))
    });
  }
}
