import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import type { BuildMode, PluginContext } from 'fumadocs-core/framework/plugin';
import { flattenTree } from 'fumadocs-core/page-tree';
import { loader } from 'fumadocs-core/source';
import { openapiPlugin, type OpenAPIPluginOptions } from '@/plugin';
import { OpenAPIPage } from '@/ui/plugin';
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
  const source = loader(await server.staticSource(), {
    baseUrl: '/',
    plugins: (await plugin.configureLoader!.call(ctx, { baseUrl: '/' }))?.plugins,
  });
  return { ctx, plugin, source, page: source.getPages()[0], server };
}

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
    expect(await plugin.getPageText!.call(ctx, page)).toBe(page.data.description ?? '');
    expect(await plugin.getPageToc!.call(ctx, page)).toBe(page.data.toc);
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toBe(page.data.structuredData);
    const data = { title: '', url: page.url, path: page.path, locale: page.locale, toc: [] };
    expect(await plugin.transformPage!.call(ctx, data, page)).toEqual({ full: true });
    expect(await plugin.transformPage!.call(ctx, { ...data, full: false }, page)).toEqual({
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
    expect(await plugin.apiRoutes!.call(ctx)).toEqual([
      { path: '/api/proxy', render: 'dynamic', ALL: expect.any(Function) },
    ]);

    const off = await createSite({ proxyUrl: '/api/proxy' }, { createProxy: false });
    expect(await off.plugin.apiRoutes!.call(off.ctx)).toEqual([]);
  });

  test('serves your own proxy', async () => {
    const handle = () => new Response('proxied');
    const { ctx, plugin } = await createSite(
      { proxyUrl: '/api/proxy' },
      { createProxy: async () => ({ handle }) as never },
    );
    expect(await plugin.apiRoutes!.call(ctx)).toEqual([
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

    expect(await plugin.apiRoutes!.call(ctx)).toEqual([]);
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

  test('needs `ClientAPIPage` for documents left out of page props', async () => {
    await expect(createSite({ includeDocument: false })).rejects.toThrow(
      'pass a `ClientAPIPage` made with `createOpenAPIPage({ loadDocument })`',
    );

    const ClientAPIPage = () => null;
    const { ctx, plugin, page } = await createSite({ includeDocument: false }, { ClientAPIPage });
    const node = (await plugin.getPageBody!.call(ctx, page))?.node as ReactElement<
      Record<string, unknown>
    >;
    expect(node.props.document).toBe('museum');
    expect(node.props.payload).not.toHaveProperty('bundled');
  });
});
