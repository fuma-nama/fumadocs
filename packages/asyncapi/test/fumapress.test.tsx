import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { flattenTree } from 'fumadocs-core/page-tree';
import { createPress, type InferAppShape } from '@fumapress/core';
import { asyncapiPlugin, AsyncAPIPage, type AsyncAPIPluginOptions } from '@/fumapress';
import { createAsyncAPI, type AsyncAPIOptions } from '@/server';

const streetlights = fileURLToPath(new URL('./fixtures/streetlights.yaml', import.meta.url));

async function createSite(
  serverOptions: AsyncAPIOptions = {},
  options: Omit<AsyncAPIPluginOptions, 'server'> = {},
) {
  const server = createAsyncAPI({ input: { streetlights }, ...serverOptions });
  const content = await server.staticSource();
  const ctx = await createPress(
    {
      content,
      preset: false,
      site: { baseUrl: 'https://example.com/docs' },
      plugins: [asyncapiPlugin<InferAppShape<typeof content>>({ server, ...options })],
    },
    { base: '/docs' },
  );
  const page = (await ctx.getLoader()).getPages()[0];
  return { ctx, page, server };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('asyncapiPlugin()', () => {
  test('renders pages with the client page', async () => {
    const { ctx, page } = await createSite();
    const node = (await ctx.getPageBody(page))?.node as ReactElement<Record<string, unknown>>;

    expect(node.type).toBe(AsyncAPIPage);
    expect(node.props.payload).toEqual({ bundled: expect.any(Object) });
    expect(await ctx.getPageText(page)).toBe(await page.data.getText('processed'));
    expect(await ctx.getPageToc(page)).toBe(page.data.toc);
    expect(await ctx.getPageStructuredData(page)).toBe(page.data.structuredData);
    expect(await ctx.getPageData(page)).toMatchObject({ full: true, toc: page.data.toc });
    expect(await ctx.getRoutes()).toEqual([]);
  });

  test('adds the loader plugin unless disabled', async () => {
    // it labels pages with their direction
    for (const [disableLoaderPlugin, type] of [
      [false, 'object'],
      [true, 'string'],
    ] as const) {
      const { ctx } = await createSite({}, { disableLoaderPlugin });
      const [item] = flattenTree((await ctx.getLoader()).pageTree.children);
      expect(item.name).toBeTypeOf(type);
    }
  });

  test('serves documents left out of page props', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { ctx, page, server } = await createSite({ includeDocument: false });
    const [route] = await ctx.getRoutes();
    const { bundled } = await server.getSchema('streetlights');

    expect(route).toMatchObject({
      path: '/api/asyncapi/[id]',
      render: 'static',
      staticPaths: ['streetlights'],
    });
    const found = await route.GET!(
      new Request('https://example.com/docs/api/asyncapi/streetlights'),
      { params: { id: 'streetlights' } },
    );
    expect(await found.json()).toEqual(JSON.parse(JSON.stringify(bundled)));
    for (const id of ['unknown', 'constructor']) {
      const missing = await route.GET!(new Request(`https://example.com/docs/api/asyncapi/${id}`), {
        params: { id },
      });
      expect(missing.status).toBe(404);
    }

    const node = (await ctx.getPageBody(page))?.node as ReactElement<Record<string, unknown>>;
    expect(node.props.document).toBe('/docs/api/asyncapi/streetlights');
    expect(node.props.payload).toEqual({});

    // server rendering reads the document of the rendered page
    const { prelude } = await prerender(node);
    const html = await new Response(prelude).text();
    // a server of the document
    expect(html).toContain('kafka://test.mykafkacluster.org');
    expect(html).toContain('rel="preload" href="/docs/api/asyncapi/streetlights"');
    expect(fetch).not.toHaveBeenCalled();
  });
});
