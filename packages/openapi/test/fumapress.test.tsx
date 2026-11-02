import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { flattenTree } from 'fumadocs-core/page-tree';
import { createPress, type BuildMode } from '@fumapress/core';
import { openapiPlugin, OpenAPIPage, type OpenAPIPluginOptions } from '@/fumapress';
import { createOpenAPI, type OpenAPIOptions } from '@/server';

const museum = fileURLToPath(new URL('./fixtures/museum.yaml', import.meta.url));

async function createSite(
  serverOptions: OpenAPIOptions,
  options: Omit<OpenAPIPluginOptions, 'server'> = {},
  mode?: BuildMode,
) {
  const server = createOpenAPI({ input: { museum }, ...serverOptions });
  const content = await server.staticSource();
  const ctx = await createPress(
    {
      mode,
      content,
      preset: false,
      site: { baseUrl: 'https://example.com/docs' },
      plugins: [openapiPlugin({ server, ...options })],
    },
    { base: '/docs' },
  );
  const page = (await ctx.getLoader()).getPages()[0];
  return { ctx, page, server };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openapiPlugin()', () => {
  test('renders pages with the client page', async () => {
    const { ctx, page } = await createSite({ proxyUrl: '/api/proxy' });
    const body = await ctx.getPageBody(page);
    const node = body?.node as ReactElement<Record<string, unknown>>;

    expect(node.type).toBe(OpenAPIPage);
    expect(node.props.payload).toMatchObject({
      bundled: expect.any(Object),
      proxyUrl: '/docs/api/proxy',
    });
    expect(await ctx.getPageToc(page)).toBe(page.data.toc);
    expect(await ctx.getPageStructuredData(page)).toBe(page.data.structuredData);
    expect(await ctx.getPageData(page)).toMatchObject({ full: true, toc: page.data.toc });
  });

  test('adds the loader plugin unless disabled', async () => {
    // it labels pages with their method
    for (const [disableLoaderPlugin, type] of [
      [false, 'object'],
      [true, 'string'],
    ] as const) {
      const { ctx } = await createSite({}, { disableLoaderPlugin });
      const [item] = flattenTree((await ctx.getLoader()).pageTree.children);
      expect(item.name).toBeTypeOf(type);
    }
  });

  test('serves the proxy at a pathname', async () => {
    const { ctx } = await createSite({ proxyUrl: '/api/proxy' });
    expect(await ctx.getRoutes()).toEqual([
      { path: '/api/proxy', render: 'dynamic', ALL: expect.any(Function) },
    ]);

    const off = await createSite({ proxyUrl: '/api/proxy' }, { createProxy: false });
    expect(await off.ctx.getRoutes()).toEqual([]);
  });

  test('serves your own proxy', async () => {
    const handle = () => new Response('proxied');
    const { ctx } = await createSite(
      { proxyUrl: '/api/proxy' },
      { createProxy: async () => ({ handle }) as never },
    );
    expect(await ctx.getRoutes()).toEqual([{ path: '/api/proxy', render: 'dynamic', ALL: handle }]);
  });

  test('renders pages with `ClientAPIPage`', async () => {
    const ClientAPIPage = () => null;
    const { ctx, page } = await createSite({}, { ClientAPIPage });
    const body = await ctx.getPageBody(page);
    expect((body?.node as ReactElement).type).toBe(ClientAPIPage);
  });

  test('leaves proxies elsewhere', async () => {
    const { ctx, page } = await createSite({ proxyUrl: 'https://proxy.example.com' });
    const node = (await ctx.getPageBody(page))?.node as ReactElement<Record<string, unknown>>;

    expect(await ctx.getRoutes()).toEqual([]);
    expect(node.props.payload).toMatchObject({ proxyUrl: 'https://proxy.example.com' });
    await expect(
      createSite({ proxyUrl: 'https://proxy.example.com' }, { createProxy: true }),
    ).rejects.toThrow('set `proxyUrl` of `createOpenAPI()` to a pathname');
    await expect(createSite({}, { createProxy: true })).rejects.toThrow(
      'set `proxyUrl` of `createOpenAPI()` to a pathname',
    );
  });

  test('needs a server for the proxy', async () => {
    await expect(createSite({ proxyUrl: '/api/proxy' }, {}, 'static')).rejects.toThrow(
      'set `createProxy: false` in static mode',
    );
  });

  test('serves documents left out of page props', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { ctx, page, server } = await createSite({ includeDocument: false });
    const [route] = await ctx.getRoutes();
    const { bundled } = await server.getSchema('museum');

    expect(route).toMatchObject({
      path: '/api/openapi/[id]',
      render: 'static',
      staticPaths: ['museum'],
    });
    const found = await route.GET!(new Request('https://example.com/docs/api/openapi/museum'), {
      params: { id: 'museum' },
    });
    expect(await found.json()).toEqual(JSON.parse(JSON.stringify(bundled)));
    for (const id of ['unknown', 'constructor']) {
      const missing = await route.GET!(new Request(`https://example.com/docs/api/openapi/${id}`), {
        params: { id },
      });
      expect(missing.status).toBe(404);
    }

    const node = (await ctx.getPageBody(page))?.node as ReactElement<Record<string, unknown>>;
    expect(node.props.document).toBe('/docs/api/openapi/museum');
    expect(node.props.payload).not.toHaveProperty('bundled');

    // server rendering reads the document of the rendered page
    const { prelude } = await prerender(node);
    const html = await new Response(prelude).text();
    expect(html).toContain(page.data.getOpenAPIPageProps().operations![0].path);
    expect(html).toContain('rel="preload" href="/docs/api/openapi/museum"');
    expect(fetch).not.toHaveBeenCalled();
  });
});
