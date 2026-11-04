import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { PluginContext } from 'fumadocs-core/framework/plugin';
import { flattenTree } from 'fumadocs-core/page-tree';
import { loader } from 'fumadocs-core/source';
import { asyncapiPlugin, AsyncAPIPage, type AsyncAPIPluginOptions } from '@/plugin';
import { createAsyncAPI, type AsyncAPIOptions } from '@/server';

const streetlights = fileURLToPath(new URL('./fixtures/streetlights.yaml', import.meta.url));

async function createSite(
  serverOptions: AsyncAPIOptions = {},
  options: Omit<AsyncAPIPluginOptions, 'server'> = {},
) {
  const server = createAsyncAPI({ input: { streetlights }, ...serverOptions });
  const plugin = asyncapiPlugin({ server, ...options });
  const ctx: PluginContext = {
    mode: 'default',
    withBase: (pathname) => `/docs${pathname}`,
    getLoader: () => source,
  };
  const source = loader(await server.staticSource(), {
    baseUrl: '/',
    plugins: (await plugin.configureLoader!.call(ctx, { baseUrl: '/' }))?.plugins,
  });
  return { ctx, plugin, source, page: source.getPages()[0], server };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('asyncapiPlugin()', () => {
  test('renders pages with the client page', async () => {
    const { ctx, plugin, page } = await createSite();
    const node = (await plugin.getPageBody!.call(ctx, page))?.node as ReactElement<
      Record<string, unknown>
    >;

    expect(node.type).toBe(AsyncAPIPage);
    expect(node.props.payload).toEqual({ bundled: expect.any(Object) });
    expect(await plugin.getPageText!.call(ctx, page)).toBe(await page.data.getText('processed'));
    expect(await plugin.getPageToc!.call(ctx, page)).toBe(page.data.toc);
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toBe(page.data.structuredData);
    const data = { title: '', url: page.url, path: page.path, locale: page.locale, toc: [] };
    expect(await plugin.transformPage!.call(ctx, data, page)).toEqual({ ...data, full: true });
    expect(await plugin.transformPage!.call(ctx, { ...data, full: false }, page)).toMatchObject({
      full: false,
    });
    expect(await plugin.routes!.call(ctx)).toBeUndefined();
  });

  test('adds the loader plugin unless disabled', async () => {
    // it labels pages with their direction
    for (const [disableLoaderPlugin, type] of [
      [false, 'object'],
      [true, 'string'],
    ] as const) {
      const { source } = await createSite({}, { disableLoaderPlugin });
      const [item] = flattenTree(source.pageTree.children);
      expect(item.name).toBeTypeOf(type);
    }
  });

  test('serves documents left out of page props', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { ctx, plugin, page, server } = await createSite({ includeDocument: false });
    const [route] = (await plugin.routes!.call(ctx))!;
    const { bundled } = await server.getSchema('streetlights');

    expect(route).toMatchObject({
      path: '/api/asyncapi/[id]',
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

    const node = (await plugin.getPageBody!.call(ctx, page))?.node as ReactElement<
      Record<string, unknown>
    >;
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
