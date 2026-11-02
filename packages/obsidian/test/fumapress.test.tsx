import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPress } from '@fumapress/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { obsidianPlugin } from '@/fumapress';
import { obsidian } from '@/index';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function createSite(dir = fixturesDir) {
  const vault = obsidian({
    dir: fixturesDir,
    url: (file) => `/vault/${file}`,
    remarkImageOptions: false,
  });
  const content = vault.dynamicSource();
  return createPress<typeof content>(
    {
      content,
      preset: false,
      site: { baseUrl: 'https://example.com' },
      plugins: [
        obsidianPlugin(obsidian({ dir }), {
          components: {
            Card: ({ href, children }) => <a href={href}>{children}</a>,
            a: (props) => <a data-link {...props} />,
          },
        }),
      ],
    },
    { base: '/' },
  );
}

describe('obsidianPlugin', () => {
  it('renders vault pages with relative links resolved', async () => {
    const ctx = await createSite();
    const page = (await ctx.getLoader()).getPage(['Welcome']);
    if (!page) throw new Error('expected the Welcome page');

    const html = renderToStaticMarkup((await ctx.getPageBody(page))?.node);
    expect(html).toContain('<a data-link="true" href="/create%20a%20link">');
    expect(html).toContain('class="flex gap-2 my-4 rounded-xl border bg-fd-card');
    expect(html).not.toContain('<strong>hidden</strong>');

    const { toc } = await ctx.getPageData(page);
    expect(toc.map((item) => item.url)).toContain('#introduction');
    await expect(ctx.getPageStructuredData(page)).resolves.toMatchObject({
      contents: expect.arrayContaining([expect.objectContaining({ content: 'Nothing' })]),
    });

    const text = await ctx.getPageText(page);
    expect(text).toContain('## Introduction!!');
    expect(text).toContain('I love Fumadocs.');
    expect(text).not.toContain('hidden');
  });

  it('ignores pages outside of the vault', async () => {
    const ctx = await createSite(path.join(fixturesDir, 'other'));
    const page = (await ctx.getLoader()).getPage(['Welcome']);
    if (!page) throw new Error('expected the Welcome page');

    await expect(ctx.getPageBody(page)).resolves.toBeUndefined();
    await expect(ctx.getPageText(page)).resolves.toBeUndefined();
  });
});
