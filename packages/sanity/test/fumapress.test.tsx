import type { SanityClient } from '@sanity/client';
import { createPress, type InferAppShape } from '@fumapress/core';
import { PortableText } from '@portabletext/react';
import { describe, expect, it, vi } from 'vitest';
import { createSanitySource } from '@/index';
import { sanityPlugin, type SanityPluginOptions } from '@/fumapress';

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
  const content = {
    docs: { files: [{ type: 'page' as const, path: 'index.mdx', data: { title: 'Home' } }] },
    sanity: createSanitySource({ client, docType: 'docs' }),
  };
  const ctx = await createPress(
    {
      content,
      preset: false,
      site: { baseUrl: 'https://example.com' },
      // plugins in an inline config don't infer the types of the site
      plugins: [sanityPlugin<InferAppShape<typeof content>>(options)],
    },
    { base: '/' },
  );
  const loader = await ctx.getLoader();
  return { ctx, fetch, page: loader.getPage(['getting-started'])!, other: loader.getPage([])! };
}

describe('sanityPlugin', () => {
  it('renders the Portable Text body with custom components', async () => {
    const components: SanityPluginOptions['components'] = { types: { callout: () => null } };
    const { ctx, page } = await createSite({ components });

    expect((await ctx.getPageBody(page))?.node).toMatchObject({
      type: PortableText,
      props: { value: body, components },
    });
  });

  it('reads the text, TOC and dates of documents, loading each once', async () => {
    const { ctx, fetch, page } = await createSite();

    expect(await ctx.getPageText(page)).toBe('Introduction\n\nHello world\n\n');
    expect(await ctx.getPageToc(page)).toEqual([
      { depth: 2, title: 'Introduction', url: '#intro' },
    ]);
    expect(await ctx.getPageCreatedAt(page)).toEqual(new Date('2026-01-01T00:00:00Z'));
    expect(await ctx.getPageData(page)).toMatchObject({
      title: 'Getting Started',
      lastModified: new Date('2026-02-01T00:00:00Z'),
    });
    expect(await ctx.getPageStructuredData(page)).toEqual({
      headings: [{ id: 'intro', content: 'Introduction' }],
      contents: [{ heading: 'intro', content: 'Hello world' }],
    });
    await ctx.getPageBody(page);

    const loads = fetch.mock.calls.filter(([query]) => query.includes('"_toc"'));
    expect(loads).toHaveLength(1);
  });

  it('leaves other pages to other plugins', async () => {
    const { ctx, other } = await createSite();

    expect(await ctx.getPageBody(other)).toBeUndefined();
    expect(await ctx.getPageText(other)).toBeUndefined();
    expect(await ctx.getPageLastModified(other)).toBeUndefined();
  });
});
