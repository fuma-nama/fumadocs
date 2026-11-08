import { type ComponentProps, createElement, type FC, type ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import type { PluginContext } from 'fumadocs-core/framework/plugin';
import { asMarkdown } from 'fumadocs-core/server';
import { loader } from 'fumadocs-core/source';
import type { MDXComponents, MDXProps } from 'mdx/types';
import mdxPlugin, { type MdxPluginOptions } from '@/press';
import { server, toFumadocsSource } from '@/runtime/server';

const lastModified = new Date('2026-11-03');
const compiled = {
  default: (props: MDXProps) => createElement('p', props),
  toc: [{ title: 'Intro', url: '#intro', depth: 2 }],
  structuredData: { headings: [], contents: [{ heading: undefined, content: 'Hello' }] },
  frontmatter: { title: 'Hello', date: '2026-11-04' },
  lastModified,
  _markdown({ components }: MDXProps) {
    asMarkdown();
    return createElement(components!.custom as () => string);
  },
};

async function createSite(async: boolean, options?: MdxPluginOptions) {
  const create = server<Record<string, never>, never>();
  // lazy collections load the frontmatter first
  const docs = async
    ? await create.docLazy(
        'docs',
        'content',
        { 'index.mdx': compiled.frontmatter },
        { 'index.mdx': async () => compiled },
      )
    : await create.doc('docs', 'content', { 'index.mdx': compiled });
  const plugin = mdxPlugin(options);
  const ctx: PluginContext = {
    withBase: (pathname) => pathname,
    getLoader: () => source,
  };
  const source = loader(toFumadocsSource(docs as never[], []), { baseUrl: '/' });
  return { ctx, plugin, page: source.getPages()[0] };
}

describe('mdxPlugin()', () => {
  test.each([false, true])('implements the page hooks (async: %s)', async (async) => {
    const components: MDXComponents = {
      custom() {
        asMarkdown();
        return 'custom text';
      },
    };
    const { ctx, plugin, page } = await createSite(async, { components });
    const body = (await plugin.getPageBody!.call(ctx, page))!.node as ReactElement<MDXProps>;

    expect(body.props.components!.custom).toBe(components.custom);
    expect(await plugin.getPageText!.call(ctx, page)).toBe('custom text');
    expect(await plugin.getPageToc!.call(ctx, page)).toBe(compiled.toc);
    expect(await plugin.getPageStructuredData!.call(ctx, page)).toBe(compiled.structuredData);
    expect(await plugin.getPageCreatedAt!.call(ctx, page)).toEqual(new Date('2026-11-04'));
    expect(await plugin.getPageLastModified!.call(ctx, page)).toBe(lastModified);
  });

  test('resolves relative links with the components of a page', async () => {
    const a = (props: ComponentProps<'a'>) => createElement('a', props);
    const pages: unknown[] = [];
    const { ctx, plugin, page } = await createSite(false, {
      components: (page) => (pages.push(page), { a }),
    });
    const body = (await plugin.getPageBody!.call(ctx, page))!.node as ReactElement<MDXProps>;
    const Link = body.props.components!.a as FC<ComponentProps<'a'>>;
    const link = Link({ href: './index.mdx#intro' }) as ReactElement<ComponentProps<'a'>>;

    expect(pages).toEqual([page]);
    expect(link.type).toBe(a);
    expect(link.props.href).toBe('/#intro');
    expect(
      (Link({ href: 'https://fumadocs.dev' }) as ReactElement<ComponentProps<'a'>>).props.href,
    ).toBe('https://fumadocs.dev');
  });

  test('leaves other pages to other plugins', async () => {
    const { ctx, plugin, page } = await createSite(false);
    const other = { ...page, data: { title: 'Other' } };
    expect(await plugin.getPageBody!.call(ctx, other)).toBeUndefined();
    expect(await plugin.getPageText!.call(ctx, other)).toBeUndefined();
    expect(await plugin.getPageCreatedAt!.call(ctx, other)).toBeUndefined();
  });
});
