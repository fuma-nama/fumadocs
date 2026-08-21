import type { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';
import { createNotionFileHandler, createNotionFileUrlResolver } from '../src/file';
import type { NotionAssetBlock } from '../src/renderer';
import type { NotionIntegration } from '../src/source';
import { block, dataSourceId, page, pageId } from './fixtures';

function integrationWith(client: unknown): NotionIntegration {
  return {
    $inferPage: undefined as never,
    client: client as Client,
    dataSourceId,
    getBlocks: vi.fn(),
    dynamicSource: vi.fn(),
  };
}

describe('createNotionFileUrlResolver', () => {
  it('routes internal assets through the file path and leaves external URLs untouched', () => {
    const resolver = createNotionFileUrlResolver({ pageId });

    const internal = block<NotionAssetBlock>({
      id: '11111111-1111-4111-8111-111111111111',
      type: 'image',
      image: {
        type: 'file',
        file: { url: 'https://notion.example/signed', expiry_time: '2026-07-14' },
        caption: [],
      },
    });
    const external = block<NotionAssetBlock>({
      id: '22222222-2222-4222-8222-222222222223',
      type: 'image',
      image: {
        type: 'external',
        external: { url: 'https://cdn.example.com/logo.png' },
        caption: [],
      },
    });

    expect(resolver(internal)).toBe(
      `/api/notion/file?page=${pageId}&block=11111111-1111-4111-8111-111111111111`,
    );
    expect(resolver(external)).toBe('https://cdn.example.com/logo.png');
  });

  it('respects a custom path and strips a trailing slash', () => {
    const resolver = createNotionFileUrlResolver({ pageId, path: 'notion/assets/' });
    const internal = block<NotionAssetBlock>({
      id: '33333333-3333-4333-8333-333333333334',
      type: 'pdf',
      pdf: {
        type: 'file',
        file: { url: 'https://notion.example/doc', expiry_time: '2026-07-14' },
        caption: [],
      },
    });

    expect(resolver(internal)).toBe(
      `/notion/assets?page=${pageId}&block=33333333-3333-4333-8333-333333333334`,
    );
  });

  it('rejects a path with a query or hash', () => {
    expect(() => createNotionFileUrlResolver({ pageId, path: '/file?foo=1' })).toThrow(
      'cannot include a query or hash',
    );
  });
});

describe('createNotionFileHandler', () => {
  it('redirects to a fresh signed URL for a block owned by the data source', async () => {
    const assetId = '11111111-1111-4111-8111-111111111111';
    const asset = block({
      id: assetId,
      type: 'image',
      image: {
        type: 'file',
        file: { url: 'https://notion.example/fresh', expiry_time: '2026-07-14' },
        caption: [],
      },
    });
    const client = {
      blocks: { retrieve: vi.fn().mockResolvedValue(asset) },
      pages: { retrieve: vi.fn().mockResolvedValue(page()) },
    };
    const handler = createNotionFileHandler(integrationWith(client));

    const response = await handler(
      new Request(`https://docs.test/api/notion/file?page=${pageId}&block=${assetId}`),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://notion.example/fresh');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('reuses a verified URL until it expires instead of calling the API again', async () => {
    const assetId = '11111111-1111-4111-8111-111111111111';
    const asset = block({
      id: assetId,
      type: 'image',
      image: {
        type: 'file',
        file: {
          url: 'https://notion.example/fresh',
          expiry_time: new Date(Date.now() + 60 * 60_000).toISOString(),
        },
        caption: [],
      },
    });
    const client = {
      blocks: { retrieve: vi.fn().mockResolvedValue(asset) },
      pages: { retrieve: vi.fn().mockResolvedValue(page()) },
    };
    const handler = createNotionFileHandler(integrationWith(client));
    const request = () =>
      handler(new Request(`https://docs.test/api/notion/file?page=${pageId}&block=${assetId}`));

    expect((await request()).status).toBe(302);
    expect((await request()).headers.get('Location')).toBe('https://notion.example/fresh');
    expect(client.blocks.retrieve).toHaveBeenCalledTimes(1);
    expect(client.pages.retrieve).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed requests', async () => {
    const handler = createNotionFileHandler(integrationWith({}));

    const missing = await handler(new Request('https://docs.test/api/notion/file'));
    expect(missing.status).toBe(400);

    const invalid = await handler(
      new Request('https://docs.test/api/notion/file?page=not-an-id&block=also-not'),
    );
    expect(invalid.status).toBe(400);
  });

  it('denies a block whose page belongs to a different data source', async () => {
    const assetId = '11111111-1111-4111-8111-111111111111';
    const asset = block({
      id: assetId,
      type: 'image',
      image: {
        type: 'file',
        file: { url: 'https://notion.example/fresh', expiry_time: '2026-07-14' },
        caption: [],
      },
    });
    const client = {
      blocks: { retrieve: vi.fn().mockResolvedValue(asset) },
      pages: {
        retrieve: vi.fn().mockResolvedValue(
          page({
            parent: {
              type: 'data_source_id',
              data_source_id: '99999999-9999-4999-8999-999999999999',
              database_id: '44444444-4444-4444-8444-444444444444',
            },
          }),
        ),
      },
    };
    const handler = createNotionFileHandler(integrationWith(client));

    const denied = await handler(
      new Request(`https://docs.test/api/notion/file?page=${pageId}&block=${assetId}`),
    );
    expect(denied.status).toBe(404);
  });
});
