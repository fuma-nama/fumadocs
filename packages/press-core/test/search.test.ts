import { describe, expect, it } from 'vitest';
import type { I18nConfig } from 'fumadocs-core/i18n';
import type { SortedResult } from 'fumadocs-core/search';
import { createPress, type InferAppShape, type PressConfig, type PressRuntime } from '@/context';
import type { Plugin } from '@/plugin';
import { flexsearchPlugin } from '@/plugins/flexsearch';
import { oramaSearchPlugin } from '@/plugins/orama-search';

const i18n: I18nConfig = { languages: ['en', 'cn'], defaultLanguage: 'en' };

const content: PressConfig['content'] = {
  files: [
    { type: 'page', path: 'docs/install.mdx', data: { title: 'Install' } },
    { type: 'page', path: 'docs/theme.mdx', data: { title: 'Theme' } },
    { type: 'page', path: 'docs/theme.cn.mdx', data: { title: 'Theme (cn)' } },
  ],
};

/** a content source with the text of each page for search */
const source: Plugin = {
  getPageStructuredData: (page) => ({
    headings: [],
    contents: [
      { heading: undefined, content: `${page.locale ?? ''} guide about ${page.slugs.at(-1)}` },
    ],
  }),
};

function createSite(
  config: Partial<PressConfig> = {},
  runtime: Partial<PressRuntime<InferAppShape>> = {},
) {
  return createPress(
    { content, preset: false, site: { baseUrl: 'https://example.com' }, ...config },
    { base: '/', ...runtime },
  );
}

async function getSearchRoute(config: Partial<PressConfig>) {
  const ctx = await createSite({ ...config, plugins: [source, config.plugins] });
  const route = (await ctx.getRoutes()).find((item) => item.path === '/api/search');
  if (!route?.GET) throw new Error('missing the search route');
  const GET = route.GET;
  return {
    route,
    async search(query: string): Promise<SortedResult[]> {
      const res = await GET(new Request(`https://example.com/api/search?${query}`), { params: {} });
      return res.json();
    },
  };
}

describe.each([
  ['flexsearch', flexsearchPlugin],
  ['orama-search', oramaSearchPlugin],
])('%s', (name, searchPlugin) => {
  it('provides search', async () => {
    const ctx = await createSite({ plugins: [searchPlugin()] });

    expect(ctx.getProvider('search')?.name).toBe(name);
  });

  it('searches on the server outside static mode', async () => {
    for (const mode of ['default', 'dynamic'] as const) {
      const { route, search } = await getSearchRoute({ mode, plugins: [searchPlugin()] });

      expect(route.render).toBe('dynamic');
      expect(await search('query=install')).toContainEqual(
        expect.objectContaining({ type: 'page', url: '/docs/install', content: 'Install' }),
      );
    }
  });

  it('searches the pages of a language', async () => {
    const { search } = await getSearchRoute({ i18n, plugins: [searchPlugin()] });

    const cn = await search('query=theme&locale=cn');
    expect(cn).toContainEqual(expect.objectContaining({ url: '/cn/docs/theme' }));
    expect(cn).not.toContainEqual(expect.objectContaining({ url: '/en/docs/theme' }));
    expect(await search('query=theme&locale=en')).toContainEqual(
      expect.objectContaining({ url: '/en/docs/theme' }),
    );
  });

  it('exports the index of every language in static mode', async () => {
    const { route, search } = await getSearchRoute({
      mode: 'static',
      i18n,
      plugins: [searchPlugin()],
    });

    expect(route.render).toBe('static');
    const index = JSON.stringify(await search(''));
    expect(index).toContain('/cn/docs/theme');
    expect(index).toContain('/en/docs/install');
  });

  it('builds the index with `buildIndex`', async () => {
    const { search } = await getSearchRoute({
      plugins: [
        searchPlugin({
          buildIndex(page) {
            return {
              id: page.url,
              url: page.url,
              title: `${page.data.title} of ${this.siteConfig.name}`,
              structuredData: { headings: [], contents: [] },
            };
          },
        }),
      ],
    });

    expect(await search('query=install')).toContainEqual(
      expect.objectContaining({ url: '/docs/install', content: 'Install of Fumapress' }),
    );
  });

  it('requires structured data from content sources', async () => {
    const ctx = await createSite({ plugins: [searchPlugin()] });
    const [route] = await ctx.getRoutes();

    await expect(
      route.GET!(new Request('https://example.com/api/search?query=install'), { params: {} }),
    ).rejects.toThrow('no content source gives the structured data of "docs/install.mdx"');
  });
});

describe('search plugins', () => {
  it('only one provides search', async () => {
    await expect(
      createSite({ plugins: [flexsearchPlugin(), oramaSearchPlugin()] }),
    ).rejects.toThrow('"flexsearch" and "orama-search" both provide "search"');
  });

  it('replace the search of the preset', async () => {
    const ctx = await createSite(
      { preset: 'recommended', plugins: [flexsearchPlugin()] },
      { preset: () => [oramaSearchPlugin()] },
    );

    expect(ctx.plugins.map((plugin) => plugin.name)).toEqual(['flexsearch']);
  });
});
