import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { isValidElement, type ReactElement } from 'react';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { PluginContext } from 'fumadocs-core/framework/plugin';
import type { I18nConfig } from 'fumadocs-core/i18n';
import { dynamicLoader, type _Internal } from 'fumadocs-core/source';
import { createGraphQL, type GraphQLOptions } from '@/server';
import { graphqlPlugin, GraphQLPage, type GraphQLPluginOptions } from '@/plugin';

const file = fileURLToPath(new URL('./fixtures/store.graphql', import.meta.url));

async function createSite(
  options: GraphQLOptions = {},
  pluginOptions: Omit<GraphQLPluginOptions, 'server'> = {},
) {
  const server = createGraphQL({ input: { store: file }, ...options });
  const plugin = graphqlPlugin({ server, ...pluginOptions });
  const ctx: PluginContext = {
    mode: 'default',
    withBase: (pathname) => `/docs${pathname}`,
    getLoader: () => content.get(),
  };
  // typed as any content, like frameworks do
  const content = dynamicLoader<_Internal.AnyInput, I18nConfig | undefined>(
    {
      docs: { files: [{ type: 'page', path: 'index.mdx', data: { title: 'Home' } }] },
      graphql: await server.staticSource({ baseDir: 'api' }),
    },
    await plugin.configureLoader!.call(ctx, { baseUrl: '/' }),
  );
  const output = await content.get();

  return { plugin, ctx, output };
}

function getPage({ output }: Awaited<ReturnType<typeof createSite>>, slugs: string[]) {
  const page = output.getPage(slugs);
  if (!page) throw new Error(`missing page ${slugs.join('/')}`);
  return page;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('graphqlPlugin', () => {
  test('renders GraphQL pages with their content', async () => {
    const site = await createSite();
    const { plugin, ctx } = site;
    const page = getPage(site, ['api', 'queries', 'orders']);

    const body = await plugin.getPageBody!.call(ctx, page);
    expect(isValidElement(body?.node) && body.node.type).toBe(GraphQLPage);
    expect(body?.node).toMatchObject({ props: { schema: 'store', items: [{ name: 'orders' }] } });
    expect(await plugin.getPageText!.call(ctx, page)).toContain('orders');
    expect(await plugin.getPageToc!.call(ctx, page)).toEqual([]);
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toMatchObject({
      contents: [{ content: 'List all orders.' }],
    });
    expect(
      await plugin.transformPage!.call(ctx, { ...page, title: 'orders', toc: [] }, page),
    ).toMatchObject({
      full: true,
    });
  });

  test('leaves other pages to other plugins', async () => {
    const site = await createSite();
    const { plugin, ctx } = site;
    const page = getPage(site, []);

    expect(await plugin.getPageBody!.call(ctx, page)).toBeUndefined();
    expect(await plugin.getPageText!.call(ctx, page)).toBeUndefined();
    expect(await plugin.getPageToc!.call(ctx, page)).toBeUndefined();
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toBeUndefined();
    const data = await plugin.transformPage!.call(ctx, { ...page, title: 'Home', toc: [] }, page);
    expect(data.full).toBeUndefined();
  });

  test('adds the loader plugin unless disabled', async () => {
    // operation pages get a badge of their kind
    for (const [disableLoaderPlugin, badge] of [
      [false, true],
      [true, false],
    ] as const) {
      const { output } = await createSite({}, { disableLoaderPlugin });
      const nodes = [...output.pageTree.children];
      let orders: unknown;
      for (const node of nodes) {
        if (node.type === 'folder') nodes.push(...node.children);
        else if (node.type === 'page' && node.url === '/api/queries/orders') orders = node.name;
      }
      expect(isValidElement(orders)).toBe(badge);
    }
  });

  test('serves schemas left out of page props', async () => {
    const included = await createSite();
    expect(await included.plugin.routes!.call(included.ctx)).toBeUndefined();

    const fetch = vi.spyOn(globalThis, 'fetch');
    const site = await createSite({ includeSchema: false });
    const { plugin, ctx } = site;
    const [route] = (await plugin.routes!.call(ctx))!;
    expect(route).toMatchObject({ path: '/api/graphql-schema/[id]', staticPaths: ['store'] });

    const request = new Request('https://example.com/docs/api/graphql-schema/store');
    const res = await route.GET!(request, { params: { id: 'store' } });
    expect(await res.text()).toBe(fs.readFileSync(file, 'utf8'));
    expect((await route.GET!(request, { params: { id: 'toString' } })).status).toBe(404);

    const page = getPage(site, ['api', 'queries', 'orders']);
    const node = (await plugin.getPageBody!.call(ctx, page))?.node as ReactElement<
      Record<string, unknown>
    >;
    expect(node.props.schema).toBe('/docs/api/graphql-schema/store');
    expect(node.props.payload).not.toHaveProperty('sdl');

    // server rendering reads the schema of the rendered page
    const { prelude } = await prerender(node);
    const html = await new Response(prelude).text();
    expect(html).toContain('List all orders.');
    expect(html).toContain('rel="preload" href="/docs/api/graphql-schema/store"');
    expect(fetch).not.toHaveBeenCalled();
  });
});
