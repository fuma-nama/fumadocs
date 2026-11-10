import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  MdastPluginDefinition,
  MdastVisitorContext,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from 'satteri';
import type {} from '@/lib/remark-feature';
import { defaultFramework } from './framework.ts';

/** the top-level pages and folders of `[framework]`, links to them omit the framework segment */
const dir = path.resolve('content/docs/(framework)/[framework]');
export const frameworkPages = new Set<string>();
for (const file of readdirSync(dir)) {
  if (!file.startsWith('.') && file !== 'index.mdx' && file !== 'meta.ts')
    frameworkPages.add(file.replace(/\.mdx$/, ''));
}

/** the URL of a link to a page of `[framework]` in a framework, like `/docs/next/search` for `/docs/search` */
export function frameworkLink(url: string, framework: string): string | undefined {
  const name = /^\/docs\/([^/#?]+)/.exec(url)?.[1];
  if (name && frameworkPages.has(name)) return `/docs/${framework}${url.slice(5)}`;
}

/**
 * Links to the pages of `[framework]` open the framework of the page. Pages of `[framework]` read it as `props` when
 * rendering: their Markdown links are expressions of it, and the page resolves rendered links with
 * {@link frameworkLink}. Other pages link to the default framework.
 */
/** whether the document is a page of `[framework]`, it reads the framework as `props` */
export function inFramework(ctx: MdastVisitorContext): boolean {
  return ctx.fileURL !== undefined && fileURLToPath(ctx.fileURL).startsWith(dir + path.sep);
}

export function remarkFrameworkLinks(): MdastPluginDefinition {
  /** the URL at an offset of the source, for the Markdown of the page */
  function edit(ctx: MdastVisitorContext, at: number, url: string, resolved: string) {
    if (!ctx.source.startsWith(url, at)) return;
    (ctx.data._sourceEdits ??= []).push({
      start: at,
      end: at + url.length,
      text: inFramework(ctx)
        ? (s) =>
            s.expression(`"/docs/" + props.framework + ${JSON.stringify(url.slice(5))}`, resolved)
        : resolved,
    });
  }

  function element(node: MdxJsxFlowElement | MdxJsxTextElement, ctx: MdastVisitorContext) {
    for (const attr of node.attributes) {
      if (attr.type !== 'mdxJsxAttribute' || attr.name !== 'href' || typeof attr.value !== 'string')
        continue;
      const resolved = frameworkLink(attr.value, defaultFramework);
      if (!resolved) continue;
      const start = node.position?.start.offset;
      // `href="` or `href='` in the opening tag
      if (start !== undefined)
        edit(ctx, ctx.source.indexOf('href=', start) + 6, attr.value, resolved);
      if (!inFramework(ctx)) ctx.setAttribute(node, 'href', resolved);
    }
  }

  return {
    name: 'remark-framework-links',
    options: { position: true },
    link(node, ctx) {
      const resolved = frameworkLink(node.url, defaultFramework);
      if (!resolved) return;
      // `[text](url)`: the URL follows the `](` after the text
      const text = node.children.at(-1)?.position?.end.offset;
      const start = node.position?.start.offset;
      if (text !== undefined) edit(ctx, text + 2, node.url, resolved);
      else if (start !== undefined) edit(ctx, start + 3, node.url, resolved);
      if (!inFramework(ctx)) ctx.setProperty(node, 'url', resolved);
    },
    mdxJsxFlowElement: element,
    mdxJsxTextElement: element,
  };
}
