import { readdirSync } from 'node:fs';
import type {
  MdastPluginDefinition,
  MdastVisitorContext,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from 'satteri';
import type {} from '@/lib/remark-feature';
import { defaultFramework, isFramework } from './framework.ts';

/** the top-level pages and folders of `[framework]`, links to them omit the framework segment */
export const frameworkPages = new Set<string>();
for (const file of readdirSync('content/docs/(framework)/[framework]')) {
  if (!file.startsWith('.') && file !== 'index.mdx' && file !== 'meta.ts')
    frameworkPages.add(file.replace(/\.mdx$/, ''));
}

/** links to the pages of `[framework]` open the framework of the page, or the default one */
export function remarkFrameworkLinks(): MdastPluginDefinition {
  function resolve(url: string, ctx: MdastVisitorContext) {
    const name = /^\/docs\/([^/#?]+)/.exec(url)?.[1];
    if (!name || !frameworkPages.has(name)) return;
    const framework = ctx.data.params?.framework;
    return `/docs/${isFramework(framework) ? framework : defaultFramework}${url.slice(5)}`;
  }

  /** replace the URL at an offset of the source, for the Markdown of the page */
  function edit(ctx: MdastVisitorContext, at: number, url: string, resolved: string) {
    if (ctx.source.startsWith(url, at))
      (ctx.data._sourceEdits ??= []).push({ start: at, end: at + url.length, text: resolved });
  }

  function element(node: MdxJsxFlowElement | MdxJsxTextElement, ctx: MdastVisitorContext) {
    for (const attr of node.attributes) {
      if (attr.type !== 'mdxJsxAttribute' || attr.name !== 'href' || typeof attr.value !== 'string')
        continue;
      const resolved = resolve(attr.value, ctx);
      if (!resolved) continue;
      const start = node.position?.start.offset;
      // `href="` or `href='` in the opening tag
      if (start !== undefined)
        edit(ctx, ctx.source.indexOf('href=', start) + 6, attr.value, resolved);
      ctx.setAttribute(node, 'href', resolved);
    }
  }

  return {
    name: 'remark-framework-links',
    options: { position: true },
    link(node, ctx) {
      const resolved = resolve(node.url, ctx);
      if (!resolved) return;
      // `[text](url)`: the URL follows the `](` after the text
      const text = node.children.at(-1)?.position?.end.offset;
      const start = node.position?.start.offset;
      if (text !== undefined) edit(ctx, text + 2, node.url, resolved);
      else if (start !== undefined) edit(ctx, start + 3, node.url, resolved);
      ctx.setProperty(node, 'url', resolved);
    },
    mdxJsxFlowElement: element,
    mdxJsxTextElement: element,
  };
}
