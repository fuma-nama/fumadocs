import type { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';
import { createNotion } from '../src/source';
import { block, dataSourceId, page, richText } from './fixtures';

describe('createNotion', () => {
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
