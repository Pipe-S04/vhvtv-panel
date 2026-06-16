export type ProviderKind = 'xtream' | 'm3u';

export interface ProviderCredentials {
  username?: string;
  password?: string;
}

export interface ProviderConnection {
  id: string;
  type: ProviderKind;
  baseUrl: string;
  credentials?: ProviderCredentials;
}

export interface ImportCategory {
  externalId: string | null;
  name: string;
}

export interface ImportChannel {
  externalStreamId: string | null;
  name: string;
  normalizedName: string;
  categoryExternalId: string | null;
  categoryName: string | null;
  logoPath: string | null;
  streamUrl: string | null;
}

export interface ImportPayload {
  categories: ImportCategory[];
  channels: ImportChannel[];
}

export interface ProviderImporter {
  readonly kind: ProviderKind;
  load(provider: ProviderConnection, signal?: AbortSignal): Promise<ImportPayload>;
}

export interface ExistingCategoryRecord {
  id: string;
  externalId: string | null;
  name: string;
}

export interface ExistingChannelRecord {
  id: string;
  externalStreamId: string | null;
  normalizedName: string;
  name: string;
}

export interface CategoryUpsert {
  externalId: string | null;
  name: string;
}

export interface ChannelUpsert {
  externalStreamId: string | null;
  name: string;
  normalizedName: string;
  categoryExternalId: string | null;
  logoPath: string | null;
  enabled: true;
}

export interface ImportRepository {
  listCategories(providerId: string): Promise<ExistingCategoryRecord[]>;
  listChannels(providerId: string): Promise<ExistingChannelRecord[]>;
  upsertCategories(providerId: string, categories: CategoryUpsert[]): Promise<void>;
  upsertChannels(providerId: string, channels: ChannelUpsert[]): Promise<void>;
  markChannelsRemoved(providerId: string, channelIds: string[]): Promise<void>;
}

export interface DuplicateReport {
  externalStreamIds: string[];
  normalizedNames: string[];
}

export interface ImportResult {
  providerId: string;
  categoriesSeen: number;
  channelsSeen: number;
  duplicateReport: DuplicateReport;
  removedChannelIds: string[];
}
