import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PluginContext } from 'fumadocs-core/framework/plugin';
import { dynamicLoader } from 'fumadocs-core/source/dynamic';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { obsidianPlugin } from '@/plugin';
import { obsidian } from '@/index';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function createSite(dir = fixturesDir) {
  const content = obsidian({
    dir: fixturesDir,
    url: (file) => `/vault/${file}`,
    remarkImageOptions: false,
  }).dynamicSource();
  const plugin = obsidianPlugin(obsidian({ dir }), {
    components: {
      Card: ({ href, children }) => <a href={href}>{children}</a>,
      a: (props) => <a data-link {...props} />,
    },
  });
  const loader = dynamicLoader(content, { baseUrl: '/' }).get();
  const ctx: PluginContext = {
    mode: 'default',
    withBase: (pathname) => pathname,
    getLoader: () => loader,
  };
  const page = (await loader).getPage(['Welcome']);
  if (!page) throw new Error('expected the Welcome page');
  return { ctx, plugin, page };
}

describe('obsidianPlugin', () => {
  it('renders vault pages with relative links resolved', async () => {
    const { ctx, plugin, page } = await createSite();

    const html = renderToStaticMarkup((await plugin.getPageBody!.call(ctx, page))?.node);
    expect(html).toContain('<a data-link="true" href="/create%20a%20link">');
    expect(html).toContain('class="flex gap-2 my-4 rounded-xl border bg-fd-card');
    expect(html).not.toContain('<strong>hidden</strong>');

    const toc = (await plugin.getPageToc!.call(ctx, page)) ?? [];
    expect(toc.map((item) => item.url)).toContain('#introduction');
    await expect(plugin.getPageStructuredData!.call(ctx, page)).resolves.toMatchObject({
      contents: expect.arrayContaining([expect.objectContaining({ content: 'Nothing' })]),
    });

    const text = await plugin.getPageText!.call(ctx, page);
    expect(text).toContain('## Introduction!!');
    expect(text).toContain('I love Fumadocs.');
    expect(text).not.toContain('hidden');
  });

  it('ignores pages outside of the vault', async () => {
    const { ctx, plugin, page } = await createSite(path.join(fixturesDir, 'other'));

    await expect(plugin.getPageBody!.call(ctx, page)).resolves.toBeUndefined();
    await expect(plugin.getPageText!.call(ctx, page)).resolves.toBeUndefined();
  });
});
