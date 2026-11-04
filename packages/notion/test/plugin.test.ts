import type { Client } from '@notionhq/client';
import type { BuildMode, PluginContext } from 'fumadocs-core/framework/plugin';
import { dynamicLoader } from 'fumadocs-core/source/dynamic';
import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { notionPlugin, type NotionPluginOptions } from '../src/plugin';
import { createNotion } from '../src/source';
import { block, dataSourceId, page, pageId, richText } from './fixtures';

const imageId = '11111111-1111-4111-8111-111111111111';
const headingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createClient() {
  return {
    dataSources: {
      query: vi.fn().mockResolvedValue({
        object: 'list',
        type: 'page_or_data_source',
        page_or_data_source: {},
        results: [page()],
        has_more: false,
        next_cursor: null,
      }),
    },
    blocks: {
      retrieve: vi.fn().mockResolvedValue(
        block({
          id: imageId,
          type: 'image',
          image: {
            type: 'file',
            file: { url: 'https://notion.example/fresh', expiry_time: '2026-07-14' },
            caption: [],
          },
        }),
      ),
      children: {
        list: vi.fn().mockResolvedValue({
          object: 'list',
          type: 'block',
          block: {},
          results: [
            block({
              id: headingId,
              type: 'heading_2',
              heading_2: { rich_text: [richText('Setup')], color: 'default', is_toggleable: false },
            }),
            block({
              id: imageId,
              type: 'image',
              image: {
                type: 'file',
                file: { url: 'https://notion.example/signed', expiry_time: '2026-07-14' },
                caption: [richText('Architecture')],
              },
            }),
          ],
          has_more: false,
          next_cursor: null,
        }),
      },
    },
    pages: { retrieve: vi.fn().mockResolvedValue(page()) },
  };
}

async function createSite(
  options?: Omit<NotionPluginOptions, 'notion'>,
  mode: BuildMode = 'default',
  source = dataSourceId,
) {
  const client = createClient();
  const content = createNotion({
    client: client as unknown as Client,
    dataSourceId,
  }).dynamicSource();
  const plugin = notionPlugin({
    notion: createNotion({ client: client as unknown as Client, dataSourceId: source }),
    highlightCode: false,
    ...options,
  });
  const ctx: PluginContext = {
    mode,
    withBase: (pathname) => `/docs${pathname}`,
    getLoader: () => loader,
  };
  await plugin.init?.call(ctx);
  const loader = dynamicLoader(content, { baseUrl: '/' }).get();
  const notionPage = (await loader).getPage(['guide', 'introduction']);
  if (!notionPage) throw new Error('expected the Notion page');
  return { ctx, plugin, client, page: notionPage };
}

async function renderHtml(node: React.ReactNode): Promise<string> {
  const stream = await renderToReadableStream(node);
  await stream.allReady;
  return new Response(stream).text();
}

describe('notionPlugin', () => {
  it('provides the content of Notion pages, fetching their blocks once', async () => {
    const { ctx, plugin, client, page } = await createSite();

    await expect(plugin.getPageText!.call(ctx, page)).resolves.toBe('Setup\n\nArchitecture');
    await expect(plugin.getPageStructuredData!.call(ctx, page)).resolves.toMatchObject({
      headings: [{ id: headingId, content: 'Setup' }],
    });
    await expect(plugin.getPageToc!.call(ctx, page)).resolves.toMatchObject([
      { title: 'Setup', url: `#${headingId}`, depth: 2 },
    ]);
    expect(await plugin.getPageCreatedAt!.call(ctx, page)).toEqual(new Date('2026-07-01'));
    expect(await plugin.getPageLastModified!.call(ctx, page)).toEqual(new Date('2026-07-02'));

    const body = await plugin.getPageBody!.call(ctx, page);
    const html = await renderHtml(body?.node);
    expect(html).toContain(`/docs/api/notion/file?page=${pageId}&amp;block=${imageId}`);
    expect(html).not.toContain('https://notion.example/signed');
    expect(client.blocks.children.list).toHaveBeenCalledOnce();
  });

  it('serves files of pages in the source only', async () => {
    const { ctx, plugin, client } = await createSite();
    const [route] = (await plugin.apiRoutes!.call(ctx)) ?? [];
    expect(route).toMatchObject({ path: '/api/notion/file', render: 'dynamic' });
    const get = (page: string) =>
      route.GET!(
        new Request(`https://example.com/docs/api/notion/file?page=${page}&block=${imageId}`),
        { params: {} },
      );

    const response = await get(pageId.replaceAll('-', '').toUpperCase());
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://notion.example/fresh');

    expect((await get('99999999-9999-4999-8999-999999999999')).status).toBe(404);
    expect((await get('')).status).toBe(404);
    expect(client.blocks.retrieve).toHaveBeenCalledOnce();
  });

  it('renders the file URLs of Notion without the file proxy', async () => {
    const { ctx, plugin, page } = await createSite({ fileProxy: false }, 'static');

    expect(await plugin.apiRoutes!.call(ctx)).toBeUndefined();
    const html = await renderHtml((await plugin.getPageBody!.call(ctx, page))?.node);
    expect(html).toContain('src="https://notion.example/signed"');
  });

  it('requires a server for the file proxy', async () => {
    await expect(createSite({}, 'static')).rejects.toThrow('Set `fileProxy: false`');
  });

  it('ignores pages of other data sources', async () => {
    const { ctx, plugin, page } = await createSite(
      {},
      'dynamic',
      '99999999-9999-4999-8999-999999999999',
    );

    await expect(plugin.getPageBody!.call(ctx, page)).resolves.toBeUndefined();
    await expect(plugin.getPageText!.call(ctx, page)).resolves.toBeUndefined();
  });
});
