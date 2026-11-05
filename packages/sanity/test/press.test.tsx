import type { SanityClient } from '@sanity/client';
import type { PluginContext } from 'fumadocs-core/framework/plugin';
import { dynamicLoader } from 'fumadocs-core/source';
import { PortableText } from '@portabletext/react';
import { describe, expect, it, vi } from 'vitest';
import { createSanitySource } from '@/index';
import sanityPlugin, { type SanityPluginOptions } from '@/press';

const body = [
  {
    _type: 'block',
    _key: 'intro',
    style: 'h2',
    children: [{ _type: 'span', _key: 's1', text: 'Introduction' }],
  },
  {
    _type: 'block',
    _key: 'text',
    style: 'normal',
    children: [{ _type: 'span', _key: 's2', text: 'Hello world' }],
  },
  { _type: 'callout', _key: 'note', text: 'Careful' },
];

/** answers the queries of `createSanitySource()` by their projection */
function createClient() {
  const fetch = vi.fn(async (query: string) => {
    if (query.includes('"_toc"'))
      return {
        _id: 'a',
        _type: 'docs',
        _createdAt: '2026-01-01T00:00:00Z',
        body,
        _toc: [body[0]],
      };
    if (query.includes('"structuredBody"'))
      return {
        structuredBody: [
          { _key: 'intro', heading: 'h2', content: 'Introduction' },
          { _key: 'text', heading: null, content: 'Hello world' },
        ],
      };
    return [
      {
        _id: 'a',
        _type: 'docs',
        _updatedAt: '2026-02-01T00:00:00Z',
        title: 'Getting Started',
        slug: { _type: 'slug', current: 'getting-started' },
      },
    ];
  });
  return { fetch, client: { fetch } as unknown as SanityClient };
}

async function createSite(options?: SanityPluginOptions) {
  const { fetch, client } = createClient();
  const plugin = sanityPlugin(options);
  const ctx: PluginContext = {
    withBase: (pathname) => pathname,
    getLoader: () => content.get(),
  };
  const content = dynamicLoader(
    {
      docs: { files: [{ type: 'page' as const, path: 'index.mdx', data: { title: 'Home' } }] },
      sanity: createSanitySource({ client, docType: 'docs' }),
    },
    { baseUrl: '/' },
  );
  const output = await content.get();
  return {
    plugin,
    ctx,
    fetch,
    page: output.getPage(['getting-started'])!,
    other: output.getPage([])!,
  };
}

describe('sanityPlugin', () => {
  it('renders the Portable Text body with custom components', async () => {
    const components: SanityPluginOptions['components'] = { types: { callout: () => null } };
    const { plugin, ctx, page } = await createSite({ components });

    expect((await plugin.getPageBody!.call(ctx, page))?.node).toMatchObject({
      type: PortableText,
      props: { value: body, components },
    });
  });

  it('reads the text, TOC and dates of documents, loading each once', async () => {
    const { plugin, ctx, fetch, page } = await createSite();

    expect(await plugin.getPageText!.call(ctx, page)).toBe('Introduction\n\nHello world\n\n');
    expect(await plugin.getPageToc!.call(ctx, page)).toEqual([
      { depth: 2, title: 'Introduction', url: '#intro' },
    ]);
    expect(await plugin.getPageCreatedAt!.call(ctx, page)).toEqual(
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(await plugin.getPageLastModified!.call(ctx, page)).toEqual(
      new Date('2026-02-01T00:00:00Z'),
    );
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toEqual({
      headings: [{ id: 'intro', content: 'Introduction' }],
      contents: [{ heading: 'intro', content: 'Hello world' }],
    });
    await plugin.getPageBody!.call(ctx, page);

    const loads = fetch.mock.calls.filter(([query]) => query.includes('"_toc"'));
    expect(loads).toHaveLength(1);
  });

  it('leaves other pages to other plugins', async () => {
    const { plugin, ctx, other } = await createSite();

    expect(await plugin.getPageBody!.call(ctx, other)).toBeUndefined();
    expect(await plugin.getPageText!.call(ctx, other)).toBeUndefined();
    expect(await plugin.getPageToc!.call(ctx, other)).toBeUndefined();
    expect(await plugin.getPageStructuredData!.call(ctx, other)).toBeUndefined();
    expect(await plugin.getPageCreatedAt!.call(ctx, other)).toBeUndefined();
    expect(await plugin.getPageLastModified!.call(ctx, other)).toBeUndefined();
  });
});
