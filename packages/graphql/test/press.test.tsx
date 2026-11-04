import { fileURLToPath } from 'node:url';
import { isValidElement, type ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import type { PluginContext } from 'fumadocs-core/framework/plugin';
import type { I18nConfig } from 'fumadocs-core/i18n';
import { dynamicLoader, type _Internal } from 'fumadocs-core/source';
import { createGraphQL, type GraphQLOptions } from '@/server';
import graphqlPlugin, { type GraphQLPluginOptions } from '@/press';
import { GraphQLPage } from '@/ui/press';

const file = fileURLToPath(new URL('./fixtures/store.graphql', import.meta.url));

async function createSite(
  options: GraphQLOptions = {},
  pluginOptions: Omit<GraphQLPluginOptions, 'server'> = {},
) {
  const server = createGraphQL({ input: { store: file }, ...options });
  const plugin = graphqlPlugin({ server, ...pluginOptions });
  const ctx: PluginContext = {
    withBase: (pathname) => `/docs${pathname}`,
    getLoader: () => content.get(),
  };
  // typed as any content, like frameworks do
  const content = dynamicLoader<_Internal.AnyInput, I18nConfig | undefined>(
    {
      docs: { files: [{ type: 'page', path: 'index.mdx', data: { title: 'Home' } }] },
      graphql: await server.staticSource({ baseDir: 'api' }),
    },
    { baseUrl: '/', ...(await plugin.configureLoader!.call(ctx, { baseUrl: '/' })) },
  );
  const output = await content.get();

  return { plugin, ctx, output };
}

function getPage({ output }: Awaited<ReturnType<typeof createSite>>, slugs: string[]) {
  const page = output.getPage(slugs);
  if (!page) throw new Error(`missing page ${slugs.join('/')}`);
  return page;
}

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
    expect(page.data).toMatchObject({ full: true });
  });

  test('leaves other pages to other plugins', async () => {
    const site = await createSite();
    const { plugin, ctx } = site;
    const page = getPage(site, []);

    expect(await plugin.getPageBody!.call(ctx, page)).toBeUndefined();
    expect(await plugin.getPageText!.call(ctx, page)).toBeUndefined();
    expect(await plugin.getPageToc!.call(ctx, page)).toBeUndefined();
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toBeUndefined();
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

  test('needs `ClientAPIPage` for schemas left out of page props', async () => {
    await expect(createSite({ includeSchema: false })).rejects.toThrow(
      'pass a `ClientAPIPage` made with `createGraphQLPage({ loadSchema })`',
    );

    const ClientAPIPage = () => null;
    const site = await createSite({ includeSchema: false }, { ClientAPIPage });
    const page = getPage(site, ['api', 'queries', 'orders']);
    const node = (await site.plugin.getPageBody!.call(site.ctx, page))?.node as ReactElement<
      Record<string, unknown>
    >;
    expect(node.props.schema).toBe('store');
    expect(node.props.payload).not.toHaveProperty('sdl');
  });
});
