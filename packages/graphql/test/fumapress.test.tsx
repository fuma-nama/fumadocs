import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { isValidElement, type ReactElement } from 'react';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createPress, type InferAppShape } from '@fumapress/core';
import { createGraphQL, type GraphQLOptions } from '@/server';
import { graphqlPlugin, GraphQLPage, type GraphQLPluginOptions } from '@/fumapress';

const file = fileURLToPath(new URL('./fixtures/store.graphql', import.meta.url));

async function createSite(
  options: GraphQLOptions = {},
  pluginOptions: Omit<GraphQLPluginOptions, 'server'> = {},
) {
  const server = createGraphQL({ input: { store: file }, ...options });
  const content = {
    docs: { files: [{ type: 'page' as const, path: 'index.mdx', data: { title: 'Home' } }] },
    graphql: await server.staticSource({ baseDir: 'api' }),
  };
  return createPress(
    {
      content,
      preset: false,
      site: { baseUrl: 'https://example.com' },
      // plugins in an inline config don't infer the types of the site
      plugins: [graphqlPlugin<InferAppShape<typeof content>>({ server, ...pluginOptions })],
    },
    { base: '/docs' },
  );
}

async function getPage(ctx: Awaited<ReturnType<typeof createSite>>, slugs: string[]) {
  const page = (await ctx.getLoader()).getPage(slugs);
  if (!page) throw new Error(`missing page ${slugs.join('/')}`);
  return page;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('graphqlPlugin', () => {
  test('renders GraphQL pages with their content', async () => {
    const ctx = await createSite();
    const page = await getPage(ctx, ['api', 'queries', 'orders']);

    const body = await ctx.getPageBody(page);
    expect(isValidElement(body?.node) && body.node.type).toBe(GraphQLPage);
    expect(body?.node).toMatchObject({ props: { schema: 'store', items: [{ name: 'orders' }] } });
    expect(await ctx.getPageText(page)).toContain('orders');
    expect(await ctx.getPageStructuredData(page)).toMatchObject({
      contents: [{ content: 'List all orders.' }],
    });
    expect(await ctx.getPageData(page)).toMatchObject({ full: true, toc: [] });
  });

  test('leaves other pages to other plugins', async () => {
    const ctx = await createSite();
    const page = await getPage(ctx, []);

    expect(await ctx.getPageBody(page)).toBeUndefined();
    expect(await ctx.getPageText(page)).toBeUndefined();
    expect((await ctx.getPageData(page)).full).toBeUndefined();
  });

  test('adds the loader plugin unless disabled', async () => {
    // operation pages get a badge of their kind
    for (const [disableLoaderPlugin, badge] of [
      [false, true],
      [true, false],
    ] as const) {
      const ctx = await createSite({}, { disableLoaderPlugin });
      const nodes = [...(await ctx.getLoader()).pageTree.children];
      let orders: unknown;
      for (const node of nodes) {
        if (node.type === 'folder') nodes.push(...node.children);
        else if (node.type === 'page' && node.url === '/api/queries/orders') orders = node.name;
      }
      expect(isValidElement(orders)).toBe(badge);
    }
  });

  test('serves schemas left out of page props', async () => {
    expect(await (await createSite()).getRoutes()).toEqual([]);

    const fetch = vi.spyOn(globalThis, 'fetch');
    const ctx = await createSite({ includeSchema: false });
    const [route] = await ctx.getRoutes();
    expect(route).toMatchObject({
      path: '/api/graphql-schema/[id]',
      render: 'static',
      staticPaths: ['store'],
    });

    const request = new Request('https://example.com/docs/api/graphql-schema/store');
    const res = await route.GET!(request, { params: { id: 'store' } });
    expect(await res.text()).toBe(fs.readFileSync(file, 'utf8'));
    expect((await route.GET!(request, { params: { id: 'toString' } })).status).toBe(404);

    const page = await getPage(ctx, ['api', 'queries', 'orders']);
    const node = (await ctx.getPageBody(page))?.node as ReactElement<Record<string, unknown>>;
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
