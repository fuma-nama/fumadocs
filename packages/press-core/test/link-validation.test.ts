import { describe, expect, it, vi } from 'vitest';
import type { I18nConfig } from 'fumadocs-core/i18n';
import type { VirtualFile } from 'fumadocs-core/source';
import { createPress, type PressConfig } from '@/context';
import type { Plugin } from '@/plugin';
import {
  linkValidationPlugin,
  type DiagnosticsFile,
  type LinkValidationOptions,
} from '@/plugins/link-validation';

const site: Record<string, string> = {
  'index.mdx': [
    '# Home',
    '[page](/docs/a) [file](./docs/a.mdx) [heading](/docs/a#intro) [self](#home)',
    '[trailing slash][ref] [route](/api/search?query=a) [param route](/og/docs/a/image.png)',
    '[mail](mailto:hi@example.com) [external](https://example.com/gone)',
    '',
    '[ref]: /docs/a/',
  ].join('\n'),
  'docs/a.mdx': '[home](../) [missing](/missing) [heading](/docs/a#nope) [relative](./b)',
};

/**
 * Generate the diagnostics file of a site whose pages have the Markdown of `texts` by file path.
 * Every page has one heading, `#home` on the index and `#intro` on the others.
 */
async function validate(
  texts: Record<string, string>,
  options?: LinkValidationOptions,
  config: Partial<PressConfig> = {},
): Promise<DiagnosticsFile> {
  const files: VirtualFile[] = [];
  for (const path in texts) files.push({ type: 'page', path, data: { title: path } });
  const source: Plugin = {
    getPageText: (page) => texts[page.path],
    getPageToc: (page) => [
      { title: 'Heading', url: page.path === 'index.mdx' ? '#home' : '#intro', depth: 1 },
    ],
    routes: () => [
      { path: '/api/search', render: 'dynamic', GET: () => Response.json([]) },
      { path: '/og/[...slugs]', render: 'dynamic', GET: () => new Response('image') },
    ],
  };
  const ctx = await createPress(
    {
      content: { files },
      preset: false,
      site: { baseUrl: 'https://example.com' },
      ...config,
      plugins: [source, config.plugins, linkValidationPlugin(options)],
    },
    { base: '/' },
  );

  const emitted = new Map<string, string | Uint8Array>();
  await ctx.build({
    async emitFile(path, content) {
      emitted.set(path, content);
    },
  });
  const file = emitted.get(options?.diagnosticsPath ?? 'fumapress-diagnostics.json');
  if (typeof file !== 'string') throw new Error('missing the diagnostics file');
  return JSON.parse(file);
}

function notFound(fromPathname: string, href: string) {
  return {
    severity: 'error',
    rule: 'link-validation/not-found',
    message: `link "${href}" not-found`,
    fromPathname,
    href,
  };
}

describe('linkValidationPlugin', () => {
  it('fails the build and names the broken links', async () => {
    await expect(validate(site)).rejects.toThrow(
      [
        '[Fumapress] broken links:',
        'In "/docs/a": link "/missing" not-found',
        'In "/docs/a": link "/docs/a#nope" not-found',
        'In "/docs/a": link "./b" not-found',
      ].join('\n'),
    );
  });

  it('writes the diagnostics with `report: "json"`', async () => {
    await expect(validate(site, { report: 'json' })).resolves.toEqual({
      diagnostics: [
        notFound('/docs/a', '/missing'),
        notFound('/docs/a', '/docs/a#nope'),
        notFound('/docs/a', './b'),
      ],
    });
  });

  it('writes an empty list when the links resolve or are ignored', async () => {
    const ignored = new Set(['/missing', '/docs/a#nope', './b']);

    await expect(
      validate(site, {
        report: 'json',
        ignored: (href) => ignored.has(href),
        diagnosticsPath: 'checks.json',
      }),
    ).resolves.toEqual({ diagnostics: [] });
  });

  it('writes the diagnostics, then fails with `report: "both"`', async () => {
    const files: VirtualFile[] = [{ type: 'page', path: 'docs/a.mdx', data: { title: 'A' } }];
    const ctx = await createPress(
      {
        content: { files },
        preset: false,
        plugins: [
          { getPageText: () => '[missing](/missing)' },
          linkValidationPlugin({ report: 'both' }),
        ],
      },
      { base: '/' },
    );
    const emitted: string[] = [];

    await expect(
      ctx.build({
        async emitFile(path) {
          emitted.push(path);
        },
      }),
    ).rejects.toThrow('In "/docs/a": link "/missing" not-found');
    expect(emitted).toEqual(['fumapress-diagnostics.json']);
  });

  it('validates external links with `externalLink`', async () => {
    const externalLink = vi.fn((href: string) => (href.endsWith('/gone') ? 'not-found' : null));
    const { diagnostics } = await validate(
      { ...site, 'docs/b.mdx': '[gone](https://example.com/gone) [ok](https://example.com)' },
      { report: 'json', externalLink },
    );

    expect(diagnostics).toEqual([
      notFound('/', 'https://example.com/gone'),
      notFound('/docs/a', '/missing'),
      // `./b` exists here
      notFound('/docs/a', '/docs/a#nope'),
      notFound('/docs/b', 'https://example.com/gone'),
    ]);
    // once per link, other schemes like `mailto:` are skipped
    expect(externalLink.mock.calls).toEqual([
      ['https://example.com/gone'],
      ['https://example.com'],
    ]);
  });

  it('matches pages with non-ASCII slugs, written encoded or not', async () => {
    const texts = {
      'docs/中文.mdx': '[self](#intro)',
      'docs/a.mdx':
        '[raw](/docs/中文#intro) [encoded](/docs/%E4%B8%AD%E6%96%87) [file](./中文.mdx)',
    };

    for (const mode of ['static', 'dynamic'] as const)
      await expect(validate(texts, { report: 'json' }, { mode })).resolves.toEqual({
        diagnostics: [],
      });
  });

  it('validates a file shared by languages once', async () => {
    const i18n: I18nConfig = { languages: ['en', 'cn'], defaultLanguage: 'en' };
    const { diagnostics } = await validate(
      { 'docs/shared.$.mdx': '[missing](/missing) [cn](/cn/docs/shared) [en](/docs/shared)' },
      { report: 'json' },
      { i18n },
    );

    expect(diagnostics).toEqual([
      notFound('/en/docs/shared', '/missing'),
      notFound('/en/docs/shared', '/docs/shared'),
    ]);
  });

  it('counts the redirects and rewrites of middleware outside static mode', async () => {
    const texts = { 'docs/b.mdx': '[redirect](/old) [rewrite](/alias) [missing](/missing)' };
    const middleware: Plugin = {
      middleware(request, next) {
        const { pathname } = new URL(request.url);
        if (pathname === '/old') return Promise.resolve(Response.redirect('https://example.com/'));
        return next(pathname === '/alias' ? '/docs/b' : undefined);
      },
    };

    await expect(validate(texts, { report: 'json' }, { plugins: [middleware] })).resolves.toEqual({
      diagnostics: [notFound('/docs/b', '/missing')],
    });
    await expect(
      validate(texts, { report: 'json' }, { mode: 'static', plugins: [middleware] }),
    ).resolves.toEqual({
      diagnostics: [
        notFound('/docs/b', '/old'),
        notFound('/docs/b', '/alias'),
        notFound('/docs/b', '/missing'),
      ],
    });
  });
});
