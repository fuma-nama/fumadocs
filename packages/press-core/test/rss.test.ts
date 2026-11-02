import { describe, expect, it } from 'vitest';
import type { I18nConfig } from 'fumadocs-core/i18n';
import type { PageData, VirtualFile } from 'fumadocs-core/source';
import { createPress, type PressConfig } from '@/context';
import type { Plugin } from '@/plugin';
import { buildRSS, rssPlugin, type RSSOptions } from '@/plugins/rss';

function page(file: string, data: PageData & { date?: string } = {}): VirtualFile {
  return { type: 'page', path: file, data: { title: file, ...data } };
}

/** dates from the frontmatter, like content sources resolve them */
const dates: Plugin = {
  getPageCreatedAt: (page) => ('date' in page.data ? new Date(String(page.data.date)) : undefined),
};

const i18n: I18nConfig = { languages: ['en', 'cn'], defaultLanguage: 'en' };

function createSite(options?: RSSOptions, config: Partial<PressConfig> = {}) {
  return createPress(
    {
      content: {
        files: [
          page('index.mdx'),
          page('blog/old.mdx', { description: 'Old post', date: '2026-01-01' }),
          page('blog/new.mdx', { date: '2026-03-01' }),
          page('blog/new.cn.mdx', { title: 'New (cn)', date: '2026-02-01' }),
        ],
      },
      preset: false,
      site: { name: 'Site', baseUrl: 'https://example.com/docs' },
      plugins: [dates, rssPlugin(options)],
      ...config,
    },
    { base: '/docs' },
  );
}

async function readFeed(ctx: Awaited<ReturnType<typeof createSite>>) {
  const [route] = await ctx.getRoutes();
  expect(route).toMatchObject({ path: '/rss.xml', render: 'static' });
  const res = await route.GET!(new Request('https://example.com/docs/rss.xml'), { params: {} });
  expect(res.headers.get('content-type')).toBe('application/rss+xml');
  return res.text();
}

describe('buildRSS', () => {
  it('builds a valid feed', () => {
    const xml = buildRSS({
      title: 'My Site',
      link: 'https://example.com',
      description: 'My Site',
      selfUrl: 'https://example.com/rss.xml',
      items: [
        {
          title: 'Hello World',
          link: 'https://example.com/blog/hello',
          description: 'First post',
          pubDate: new Date('2026-01-01T00:00:00Z'),
          categories: ['news'],
        },
        { title: 'No Date', link: 'https://example.com/blog/no-date' },
      ],
    });

    expect(xml).toContain(`<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`);
    expect(xml).toContain('<title>My Site</title>');
    expect(xml).toContain(
      `<atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>`,
    );
    expect(xml).toContain('<lastBuildDate>Thu, 01 Jan 2026 00:00:00 GMT</lastBuildDate>');
    expect(xml).toContain('<pubDate>Thu, 01 Jan 2026 00:00:00 GMT</pubDate>');
    expect(xml).toContain('<guid>https://example.com/blog/hello</guid>');
    expect(xml).toContain('<category>news</category>');
    expect(xml).toContain('<title>No Date</title>');
  });
});

describe('rssPlugin', () => {
  it('serves dated pages newest first, with absolute links', async () => {
    const xml = await readFeed(await createSite());

    expect(xml).toContain('<link>https://example.com/docs</link>');
    expect(xml).toContain('<atom:link href="https://example.com/docs/rss.xml"');
    expect(xml.indexOf('blog/new.mdx')).toBeLessThan(xml.indexOf('blog/old.mdx'));
    expect(xml).toContain('<link>https://example.com/docs/blog/old</link>');
    expect(xml).toContain('<description>Old post</description>');
    expect(xml).not.toContain('index.mdx');
  });

  it('covers every language without fallback pages', async () => {
    const xml = await readFeed(await createSite({}, { i18n }));

    expect(xml).toContain('<link>https://example.com/docs/cn/blog/new</link>');
    expect(xml).toContain('<link>https://example.com/docs/en/blog/old</link>');
    expect(xml).not.toContain('/cn/blog/old');
  });

  it('takes items, limit and channel options', async () => {
    const xml = await readFeed(
      await createSite({
        title: 'Feed',
        language: 'en-us',
        limit: 2,
        getItem(page) {
          return { title: `Item ${page.path}`, link: this.absoluteUrl(page.url) };
        },
        additionalItems: () => [
          { title: 'Extra', link: 'https://example.org/extra', pubDate: '2027-01-01' },
        ],
      }),
    );

    expect(xml).toContain('<title>Feed</title><link>');
    expect(xml).toContain('<description>Feed</description><language>en-us</language>');
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml).toContain('<title>Extra</title>');
  });

  it('links the feed from every page', async () => {
    const ctx = await createSite({ title: 'Feed' });
    const link = {
      tag: 'link',
      attrs: {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: 'Feed',
        href: 'https://example.com/docs/rss.xml',
      },
    };
    const index = (await ctx.getLoader()).getPage([]);

    await expect(ctx.getHead({})).resolves.toEqual([link]);
    expect(await ctx.getHead({ page: index })).not.toContainEqual(link);
    await expect((await createSite({ alternateLink: false })).getHead({})).resolves.toEqual([]);
  });
});
