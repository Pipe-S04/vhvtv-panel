import { detectDuplicates, normalizeChannel, normalizePayload } from './normalize.js';
import type {
  ImportPayload,
  ImportRepository,
  ImportResult,
  ProviderConnection,
  ProviderImporter
} from './types.js';

function importedChannelKey(channel: {
  externalStreamId: string | null;
  normalizedName: string;
}): string {
  return channel.externalStreamId
    ? `external:${channel.externalStreamId}`
    : `name:${channel.normalizedName}`;
}

export async function importProviderChannels(
  provider: ProviderConnection,
  importer: ProviderImporter,
  repository: ImportRepository,
  signal?: AbortSignal
): Promise<ImportResult> {
  if (provider.type !== importer.kind) {
    throw new Error(`Importer ${importer.kind} cannot import provider type ${provider.type}`);
  }

  const rawPayload = await importer.load(provider, signal);
  const normalizedChannels = rawPayload.channels
    .map((channel) => normalizeChannel(channel))
    .filter((channel) => channel !== null);
  const duplicates = detectDuplicates(normalizedChannels);
  const payload = normalizePayload(rawPayload);

  await repository.upsertCategories(provider.id, payload.categories);
  await repository.upsertChannels(
    provider.id,
    payload.channels.map((channel) => ({
      externalStreamId: channel.externalStreamId,
      name: channel.name,
      normalizedName: channel.normalizedName,
      categoryExternalId: channel.categoryExternalId,
      logoPath: channel.logoPath,
      enabled: true
    }))
  );

  const existing = await repository.listChannels(provider.id);
  const importedKeys = new Set(payload.channels.map(importedChannelKey));
  const removedChannelIds = existing
    .filter((channel) => !importedKeys.has(importedChannelKey(channel)))
    .map((channel) => channel.id);
  if (removedChannelIds.length > 0)
    await repository.markChannelsRemoved(provider.id, removedChannelIds);

  return {
    providerId: provider.id,
    categoriesSeen: payload.categories.length,
    channelsSeen: payload.channels.length,
    duplicateReport: duplicates,
    removedChannelIds
  };
}

export function createStaticImporter(
  kind: ProviderImporter['kind'],
  payload: ImportPayload
): ProviderImporter {
  return { kind, load: async () => payload };
}
