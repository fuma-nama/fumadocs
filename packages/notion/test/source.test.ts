import type { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';
import { createNotion } from '../src/source';
import { block, dataSourceId, page, richText } from './fixtures';

describe('createNotion', () => {
  it('queries every page and lazily loads paginated nested blocks once', async () => {
    const notionPage = page();
    const heading = block({
      id: 'heading',
      type: 'heading_2',
      has_children: true,
      heading_2: { rich_text: [richText('Install')], color: 'default', is_toggleable: false },
    });
    const nested = block({
      id: 'nested',
      type: 'paragraph',
      parent: { type: 'block_id', block_id: 'heading' },
      paragraph: { rich_text: [richText('Nested details')], color: 'default', icon: null },
    });
    const paragraph = block({
      id: 'paragraph',
      type: 'paragraph',
      paragraph: { rich_text: [richText('Continue')], color: 'default', icon: null },
    });

    const query = vi
      .fn()
      .mockResolvedValueOnce({
        object: 'list',
        type: 'page_or_data_source',
        page_or_data_source: {},
        results: [notionPage],
        has_more: true,
        next_cursor: 'pages:2',
      })
      .mockResolvedValueOnce({
        object: 'list',
        type: 'page_or_data_source',
        page_or_data_source: {},
        results: [],
        has_more: false,
        next_cursor: null,
      });
    const list = vi.fn(async ({ block_id, start_cursor }: Record<string, string>) => {
      if (block_id === notionPage.id && !start_cursor) {
        return blockList([heading], true, 'blocks:2');
      }
      if (block_id === notionPage.id && start_cursor === 'blocks:2') {
        return blockList([paragraph]);
      }
      if (block_id === heading.id) return blockList([nested]);
      return blockList([]);
    });
    const client = {
      dataSources: { query },
      blocks: { children: { list } },
    } as unknown as Client;
    const integration = createNotion({ client, dataSourceId });

    const files = await integration.dynamicSource({ baseDir: 'docs' }).files();
    expect(query.mock.calls[0]?.[0]).not.toHaveProperty('in_trash');
    expect(query).toHaveBeenNthCalledWith(2, expect.objectContaining({ start_cursor: 'pages:2' }));
    expect(files).toHaveLength(1);
    const file = files[0]!;
    expect(file).toMatchObject({
      type: 'page',
      path: 'docs/guide/introduction.mdx',
      slugs: ['guide', 'introduction'],
      data: {
        title: 'Introduction',
        description: 'Start here',
        icon: '📘',
      },
    });

    if (file.type !== 'page') throw new Error('Expected a page');
    const first = await file.data.load();
    const second = await file.data.load();
    expect(second).toBe(first);
    expect(first.blocks).toMatchObject([
      { id: 'heading', children: [{ id: 'nested' }] },
      { id: 'paragraph' },
    ]);
    expect(list).toHaveBeenCalledTimes(3);
    await expect(file.data.structuredData()).resolves.toEqual({
      headings: [{ id: 'heading', content: 'Install' }],
      contents: [
        { heading: 'heading', content: 'Nested details' },
        { heading: 'heading', content: 'Continue' },
      ],
    });
    expect(list).toHaveBeenCalledTimes(3);
  });

  it('rejects duplicate virtual paths', async () => {
    const client = {
      dataSources: {
        query: vi.fn().mockResolvedValue({
          object: 'list',
          type: 'page_or_data_source',
          page_or_data_source: {},
          results: [page(), page({ id: '55555555-5555-4555-8555-555555555555' })],
          has_more: false,
          next_cursor: null,
        }),
      },
      blocks: { children: { list: vi.fn() } },
    } as unknown as Client;

    await expect(createNotion({ client, dataSourceId }).dynamicSource().files()).rejects.toThrow(
      'resolve to the same virtual path',
    );
  });

  it('fails when Notion reports an incomplete data source query', async () => {
    const client = {
      dataSources: {
        query: vi.fn().mockResolvedValue({
          object: 'list',
          type: 'page_or_data_source',
          page_or_data_source: {},
          results: [page()],
          has_more: false,
          next_cursor: null,
          request_status: { type: 'incomplete' },
        }),
      },
      blocks: { children: { list: vi.fn() } },
    } as unknown as Client;

    await expect(createNotion({ client, dataSourceId }).dynamicSource().files()).rejects.toThrow(
      "reached Notion's result limit",
    );
  });

  it('limits nested block requests across sibling branches', async () => {
    const child = (id: string) =>
      block({
        id,
        type: 'toggle',
        has_children: true,
        toggle: { rich_text: [richText(id)], color: 'default' },
      });
    let active = 0;
    let maximumActive = 0;
    const list = vi.fn(async ({ block_id }: { block_id: string }) => {
      if (block_id === page().id) return blockList([child('first'), child('second')]);
      active++;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return blockList([]);
    });
    const client = {
      dataSources: { query: vi.fn() },
      blocks: { children: { list } },
    } as unknown as Client;

    await createNotion({ client, dataSourceId, blockConcurrency: 1 }).getBlocks(page().id);
    expect(maximumActive).toBe(1);
  });

  it('hydrates meeting note sections referenced by block ID', async () => {
    const summary = block({
      id: 'summary',
      type: 'paragraph',
      paragraph: { rich_text: [richText('Summary')], color: 'default', icon: null },
    });
    const notes = block({
      id: 'notes',
      type: 'toggle',
      has_children: true,
      toggle: { rich_text: [richText('Notes')], color: 'default' },
    });
    const detail = block({
      id: 'detail',
      type: 'paragraph',
      paragraph: { rich_text: [richText('Action item')], color: 'default', icon: null },
    });
    const meeting = block({
      id: 'meeting',
      type: 'meeting_notes',
      meeting_notes: {
        title: [richText('Weekly sync')],
        children: { summary_block_id: summary.id, notes_block_id: notes.id },
      },
    });
    const list = vi.fn(async ({ block_id }: { block_id: string }) => {
      if (block_id === page().id) return blockList([meeting]);
      if (block_id === notes.id) return blockList([detail]);
      return blockList([]);
    });
    const retrieve = vi.fn(async ({ block_id }: { block_id: string }) => {
      if (block_id === summary.id) return summary;
      if (block_id === notes.id) return notes;
      throw new Error(`Unexpected block: ${block_id}`);
    });
    const client = {
      dataSources: { query: vi.fn() },
      blocks: { children: { list }, retrieve },
    } as unknown as Client;

    await expect(
      createNotion({ client, dataSourceId }).getBlocks(page().id),
    ).resolves.toMatchObject([
      {
        id: 'meeting',
        children: [{ id: 'summary' }, { id: 'notes', children: [{ id: 'detail' }] }],
      },
    ]);
    expect(retrieve).toHaveBeenCalledTimes(2);
  });
});

function blockList(results: unknown[], hasMore = false, nextCursor: string | null = null) {
  return {
    object: 'list',
    type: 'block',
    block: {},
    results,
    has_more: hasMore,
    next_cursor: nextCursor,
  };
}
