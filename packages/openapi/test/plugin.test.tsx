import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { BuildMode, PluginContext } from 'fumadocs-core/framework/plugin';
import { flattenTree } from 'fumadocs-core/page-tree';
import { loader } from 'fumadocs-core/source';
import { openapiPlugin, OpenAPIPage, type OpenAPIPluginOptions } from '@/plugin';
import { createOpenAPI, type OpenAPIOptions } from '@/server';

const museum = fileURLToPath(new URL('./fixtures/museum.yaml', import.meta.url));

async function createSite(
  serverOptions: OpenAPIOptions,
  options: Omit<OpenAPIPluginOptions, 'server'> = {},
  mode: BuildMode = 'default',
) {
  const server = createOpenAPI({ input: { museum }, ...serverOptions });
  const plugin = openapiPlugin({ server, ...options });
  const ctx: PluginContext = {
    mode,
    withBase: (pathname) => `/docs${pathname}`,
    getLoader: () => source,
  };
  await plugin.init?.call(ctx);
  const { plugins } = await plugin.configureLoader!.call(ctx, { baseUrl: '/' });
  const source = loader(await server.staticSource(), { baseUrl: '/', plugins });
  return { ctx, plugin, source, page: source.getPages()[0], server };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openapiPlugin()', () => {
  test('renders pages with the client page', async () => {
    const { ctx, plugin, page } = await createSite({ proxyUrl: '/api/proxy' });
    const body = await plugin.getPageBody!.call(ctx, page);
    const node = body?.node as ReactElement<Record<string, unknown>>;

    expect(node.type).toBe(OpenAPIPage);
    expect(node.props.payload).toMatchObject({
      bundled: expect.any(Object),
      proxyUrl: '/docs/api/proxy',
    });
    expect(await plugin.getPageToc!.call(ctx, page)).toBe(page.data.toc);
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toBe(page.data.structuredData);
    const data = { title: '', url: page.url, path: page.path, locale: page.locale, toc: [] };
    expect(await plugin.transformPage!.call(ctx, data, page)).toEqual({ ...data, full: true });
    expect(await plugin.transformPage!.call(ctx, { ...data, full: false }, page)).toMatchObject({
      full: false,
    });
  });

  test('adds the loader plugin unless disabled', async () => {
    // it labels pages with their method
    for (const [disableLoaderPlugin, type] of [
      [false, 'object'],
      [true, 'string'],
    ] as const) {
      const { source } = await createSite({}, { disableLoaderPlugin });
      const [item] = flattenTree(source.pageTree.children);
      expect(item.name).toBeTypeOf(type);
    }
  });

  test('serves the proxy at a pathname', async () => {
    const { ctx, plugin } = await createSite({ proxyUrl: '/api/proxy' });
    expect(await plugin.routes!.call(ctx)).toEqual([
      { path: '/api/proxy', render: 'dynamic', ALL: expect.any(Function) },
    ]);

    const off = await createSite({ proxyUrl: '/api/proxy' }, { createProxy: false });
    expect(await off.plugin.routes!.call(off.ctx)).toEqual([]);
  });

  test('serves your own proxy', async () => {
    const handle = () => new Response('proxied');
    const { ctx, plugin } = await createSite(
      { proxyUrl: '/api/proxy' },
      { createProxy: async () => ({ handle }) as never },
    );
    expect(await plugin.routes!.call(ctx)).toEqual([
      { path: '/api/proxy', render: 'dynamic', ALL: handle },
    ]);
  });

  test('renders pages with `ClientAPIPage`', async () => {
    const ClientAPIPage = () => null;
    const { ctx, plugin, page } = await createSite({}, { ClientAPIPage });
    const body = await plugin.getPageBody!.call(ctx, page);
    expect((body!.node as ReactElement).type).toBe(ClientAPIPage);
  });

  test('leaves proxies elsewhere', async () => {
    const { ctx, plugin, page } = await createSite({ proxyUrl: 'https://proxy.example.com' });
    const node = (await plugin.getPageBody!.call(ctx, page))?.node as ReactElement<
      Record<string, unknown>
    >;

    expect(await plugin.routes!.call(ctx)).toEqual([]);
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
    const { ctx, plugin, page, server } = await createSite({ includeDocument: false });
    const [route] = (await plugin.routes!.call(ctx))!;
    const { bundled } = await server.getSchema('museum');

    expect(route).toMatchObject({
      path: '/api/openapi/[id]',
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

    const node = (await plugin.getPageBody!.call(ctx, page))?.node as ReactElement<
      Record<string, unknown>
    >;
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
