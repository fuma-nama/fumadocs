import { describe, expect, it, vi } from 'vitest';
import type { I18nConfig } from 'fumadocs-core/i18n';
import type { VirtualFile } from 'fumadocs-core/source';
import { createPress, type PressConfig } from '@/context';
import type { ApiRoute } from '@/plugin';
import { takumiPlugin, type TakumiOptions } from '@/plugins/takumi';

function page(file: string): VirtualFile {
  return { type: 'page', path: file, data: { title: file, description: `About ${file}` } };
}

const i18n: I18nConfig = {
  languages: ['en', 'cn'],
  defaultLanguage: 'en',
  hideLocale: 'default-locale',
};

/** `docs/basics` is translated, `docs/only-en` falls back to English in `cn` */
function createSite(options?: TakumiOptions, config: Partial<PressConfig> = {}) {
  return createPress(
    {
      content: {
        files: [
          page('index.mdx'),
          page('docs/basics.mdx'),
          page('docs/basics.cn.mdx'),
          page('docs/only-en.mdx'),
        ],
      },
      preset: false,
      site: { name: 'Site', baseUrl: 'https://example.com/docs' },
      plugins: [takumiPlugin(options)],
      ...config,
    },
    { base: '/docs' },
  );
}

async function getPage(
  ctx: Awaited<ReturnType<typeof createSite>>,
  slugs: string[],
  lang?: string,
) {
  const page = (await ctx.getLoader()).getPage(slugs, lang);
  if (!page) throw new Error(`missing page ${slugs.join('/')} (${lang})`);
  return page;
}

function request(route: ApiRoute, slugs: string[]) {
  return route.GET!(new Request('https://example.com/'), { params: { slugs } });
}

async function readImage(route: ApiRoute, slugs: string[]) {
  const res = await request(route, slugs);
  const bytes = new Uint8Array(await res.arrayBuffer());

  expect(res.headers.get('content-type')).toBe('image/webp');
  expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('RIFF');
  return res;
}

describe('routes', () => {
  it('serves the images of every language without fallback pages', async () => {
    const ctx = await createSite({}, { i18n });
    const routes = await ctx.getRoutes();

    expect(ctx.getProvider('og-image')?.name).toBe('takumi');
    expect(routes.map(({ path, render, staticPaths }) => ({ path, render, staticPaths }))).toEqual([
      {
        path: '/og/[...slugs]',
        render: 'static',
        staticPaths: [['index.webp'], ['docs', 'basics.webp'], ['docs', 'only-en.webp']],
      },
      { path: '/cn/og/[...slugs]', render: 'static', staticPaths: [['docs', 'basics.webp']] },
    ]);

    await readImage(routes[0], ['index.webp']);
    await readImage(routes[1], ['docs', 'basics.webp']);
    for (const [route, slugs] of [
      [routes[1], ['docs', 'only-en.webp']],
      [routes[0], ['docs', 'basics']],
      [routes[0], ['docs', 'missing.webp']],
    ] as const) {
      expect((await request(route, [...slugs])).status).toBe(404);
    }
  });

  it('renders on request in dynamic mode, under `basePath`', async () => {
    const [route] = await (
      await createSite({ basePath: '/images/' }, { mode: 'dynamic' })
    ).getRoutes();

    expect(route).toMatchObject({ path: '/images/[...slugs]', render: 'dynamic' });
    await readImage(route, ['docs', 'only-en.webp']);
  });

  it('applies shared options under the ones from generate()', async () => {
    const seen: string[] = [];
    const [route] = await (
      await createSite({
        width: 600,
        height: 315,
        options: { headers: { 'x-shared': '1' }, status: 200 },
        generate(page) {
          seen.push(`${this.siteConfig.name} ${page.url}`);
          return { node: <div>Page</div>, options: { status: 201 } };
        },
      })
    ).getRoutes();

    const res = await readImage(route, ['docs', 'basics.webp']);
    expect(res.status).toBe(201);
    expect(res.headers.get('x-shared')).toBe('1');
    expect(seen).toEqual(['Site /docs/basics']);
  });
});

describe('page image', () => {
  it('adds the meta tags and `image` of content pages', async () => {
    const ctx = await createSite({ width: 600, height: 315 });
    const page = await getPage(ctx, ['docs', 'basics']);
    const url = 'https://example.com/docs/og/docs/basics.webp';

    await expect(ctx.getPageData(page)).resolves.toMatchObject({ image: url });
    const tags = await ctx.getHead({ page });
    // `og:image` from the page data, its size from the plugin
    expect(tags).toEqual(
      expect.arrayContaining([
        { tag: 'meta', attrs: { property: 'og:image', content: url } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: url } },
      ]),
    );
    expect(tags.slice(-2)).toEqual([
      { tag: 'meta', attrs: { property: 'og:image:width', content: '600' } },
      { tag: 'meta', attrs: { property: 'og:image:height', content: '315' } },
    ]);
    await expect(ctx.getHead({})).resolves.toEqual([]);
  });

  it('localizes the image, fallback pages use the one of their origin', async () => {
    const ctx = await createSite({}, { i18n });
    const image = async (slugs: string[], lang: string) =>
      (await ctx.getPageData(await getPage(ctx, slugs, lang))).image;

    await expect(image(['docs', 'basics'], 'cn')).resolves.toBe(
      'https://example.com/docs/cn/og/docs/basics.webp',
    );
    await expect(image(['docs', 'only-en'], 'cn')).resolves.toBe(
      'https://example.com/docs/og/docs/only-en.webp',
    );
    await expect(image([], 'en')).resolves.toBe('https://example.com/docs/og/index.webp');
  });

  it('falls back to the base path without `site.baseUrl`', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const ctx = await createSite({}, { site: { name: 'Site' } });
    const page = await getPage(ctx, ['docs', 'basics']);

    await expect(ctx.getPageData(page)).resolves.toMatchObject({
      image: '/docs/og/docs/basics.webp',
    });
  });
});
