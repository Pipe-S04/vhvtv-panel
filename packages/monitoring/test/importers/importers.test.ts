import { describe, expect, it, vi } from 'vitest';

import {
  createStaticImporter,
  importProviderChannels,
  normalizeName,
  parseM3uPlaylist,
  XtreamCodesImporter,
  type ImportRepository
} from '../../src/importers/index.js';

function repositoryStub(
  existingChannels = [] as Awaited<ReturnType<ImportRepository['listChannels']>>
) {
  return {
    listCategories: vi.fn(async () => []),
    listChannels: vi.fn(async () => existingChannels),
    upsertCategories: vi.fn(async () => undefined),
    upsertChannels: vi.fn(async () => undefined),
    markChannelsRemoved: vi.fn(async () => undefined)
  } satisfies ImportRepository;
}

describe('provider import normalization', () => {
  it('normalizes names consistently', () => {
    expect(normalizeName('  VH1 HD &amp; México!! ')).toBe('vh1 hd mexico');
  });

  it('parses M3U categories and channels without storing stream URLs or remote logos', () => {
    const parsed = parseM3uPlaylist(`#EXTM3U
#EXTINF:-1 tvg-id="abc" tvg-name="News One" tvg-logo="https://img.test/logo.png" group-title="News",News One HD
http://stream.test/live/news-one.m3u8
#EXTINF:-1 tvg-id="sports" group-title="Sports",Sports 1
http://stream.test/live/sports-one.m3u8`);

    expect(parsed.categories).toEqual([
      { externalId: 'news', name: 'News' },
      { externalId: 'sports', name: 'Sports' }
    ]);
    expect(parsed.channels).toMatchObject([
      {
        externalStreamId: 'abc',
        name: 'News One HD',
        normalizedName: 'news one hd',
        categoryExternalId: 'news',
        logoPath: null,
        streamUrl: null
      },
      {
        externalStreamId: 'sports',
        name: 'Sports 1',
        normalizedName: 'sports 1',
        categoryExternalId: 'sports',
        logoPath: null,
        streamUrl: null
      }
    ]);
    expect(JSON.stringify(parsed)).not.toContain('stream.test');
    expect(JSON.stringify(parsed)).not.toContain('img.test');
  });

  it('imports updates, detects duplicates before dedupe, and marks missing channels removed', async () => {
    const repository = repositoryStub([
      { id: 'keep', externalStreamId: '10', normalizedName: 'alpha', name: 'Alpha' },
      { id: 'removed', externalStreamId: '11', normalizedName: 'old channel', name: 'Old Channel' }
    ]);
    const importer = createStaticImporter('m3u', {
      categories: [{ externalId: 'general', name: 'General' }],
      channels: [
        {
          externalStreamId: '10',
          name: 'Alpha',
          normalizedName: 'alpha',
          categoryExternalId: 'general',
          categoryName: 'General',
          logoPath: null,
          streamUrl: null
        },
        {
          externalStreamId: '10',
          name: 'Alpha Copy',
          normalizedName: 'alpha copy',
          categoryExternalId: 'general',
          categoryName: 'General',
          logoPath: null,
          streamUrl: null
        }
      ]
    });

    const result = await importProviderChannels(
      { id: 'provider-1', type: 'm3u', baseUrl: 'https://safe.test' },
      importer,
      repository
    );

    expect(result.duplicateReport.externalStreamIds).toEqual(['10']);
    expect(repository.upsertChannels).toHaveBeenCalledWith('provider-1', [
      {
        externalStreamId: '10',
        name: 'Alpha',
        normalizedName: 'alpha',
        categoryExternalId: 'general',
        logoPath: null,
        enabled: true
      }
    ]);
    expect(repository.markChannelsRemoved).toHaveBeenCalledWith('provider-1', ['removed']);
  });

  it('builds Xtream requests server-side and redacts credential URLs on failure', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const importer = new XtreamCodesImporter();

    await expect(
      importer.load({
        id: 'provider-2',
        type: 'xtream',
        baseUrl: 'https://xtream.test',
        credentials: { username: 'demo', password: 'secret' }
      })
    ).rejects.toThrow(/\[REDACTED_URL\]/);

    await expect(
      importer.load({
        id: 'provider-2',
        type: 'xtream',
        baseUrl: 'https://xtream.test',
        credentials: { username: 'demo', password: 'secret' }
      })
    ).rejects.not.toThrow(/demo|secret/);
    const calledUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(calledUrl.searchParams.get('username')).toBe('demo');
    expect(calledUrl.searchParams.get('password')).toBe('secret');
    vi.unstubAllGlobals();
  });
});
