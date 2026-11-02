import { describe, expect, it } from 'vitest';
import { createPress, type PressConfig } from '@/context';
import { robotsPlugin, type RobotsOptions } from '@/plugins/robots';
import { sitemapPlugin } from '@/plugins/sitemap';

const content: PressConfig['content'] = { files: [] };

async function generate(options?: RobotsOptions, sitemap?: string | false) {
  const ctx = await createPress(
    {
      content,
      preset: false,
      site: { baseUrl: 'https://example.com/repo' },
      plugins: [robotsPlugin(options), sitemap !== false && sitemapPlugin({ path: sitemap })],
    },
    { base: '/repo/' },
  );
  const route = (await ctx.getRoutes()).find(
    (item) => item.path === (options?.path ?? '/robots.txt'),
  );
  const res = await route!.GET!(new Request('https://example.com/repo/robots.txt'), { params: {} });

  expect(res.headers.get('Content-Type')).toBe('text/plain');
  return res.text();
}

describe('robotsPlugin', () => {
  it('allows every crawler and references the sitemap of the sitemap plugin', async () => {
    await expect(generate({}, '/sitemap-0.xml')).resolves.toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/repo/sitemap-0.xml',
    );
    await expect(generate({}, false)).resolves.toBe('User-agent: *\nAllow: /');
  });

  it('renders rules and the sitemap option', async () => {
    const rules: RobotsOptions['rules'] = [
      { userAgent: ['GPTBot', 'CCBot'], disallow: '/' },
      { allow: ['/docs', '/blog'], disallow: '/api', crawlDelay: 2 },
    ];

    await expect(
      generate(
        { path: '/robots-file.txt', rules, sitemap: true, additionalContent: '# end' },
        false,
      ),
    ).resolves.toBe(
      [
        'User-agent: GPTBot\nUser-agent: CCBot\nDisallow: /',
        'User-agent: *\nAllow: /docs\nAllow: /blog\nDisallow: /api\nCrawl-delay: 2',
        'Sitemap: https://example.com/repo/sitemap.xml',
        '# end',
      ].join('\n\n'),
    );
    await expect(generate({ sitemap: 'https://cdn.example.com/sitemap.xml' })).resolves.toContain(
      'Sitemap: https://cdn.example.com/sitemap.xml',
    );
    await expect(generate({ sitemap: false })).resolves.not.toContain('Sitemap');
  });
});
