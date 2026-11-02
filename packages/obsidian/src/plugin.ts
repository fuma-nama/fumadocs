import path from 'node:path';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Plugin, PluginContext } from 'fumadocs-core/framework/plugin';
import type { Page } from 'fumadocs-core/source';
import type { MDXComponents } from 'mdx/types';
import { createElement, type ComponentProps } from 'react';
import type { ObsidianRendererResult } from './renderer';
import type { ObsidianPage, ObsidianSource } from './source';
import * as ObsidianComponents from './ui';

export interface ObsidianPluginOptions {
  /** components to render pages with, like the MDX components of Fumadocs UI, with the Obsidian components by default */
  components?: MDXComponents;
}

/**
 * Render the pages of an Obsidian vault from `obsidian()`, with relative links resolved to the URLs of their pages.
 */
export function obsidianPlugin(
  vault: ObsidianSource<StandardSchemaV1, StandardSchemaV1>,
  { components }: ObsidianPluginOptions = {},
): Plugin {
  // a vault change creates new pages, so their results stay valid
  const rendered = new WeakMap<ObsidianPage, Promise<ObsidianRendererResult>>();
  const Link = components?.a ?? 'a';

  /** pages of this vault, other local sources have the same page data */
  function isVaultPage(page: Page): page is Page & { data: ObsidianPage } {
    if (!page.absolutePath) return false;
    const relative = path.relative(vault.dir, page.absolutePath);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  }

  function render(
    ctx: PluginContext,
    page: Page & { data: ObsidianPage },
  ): Promise<ObsidianRendererResult> {
    let result = rendered.get(page.data);
    if (!result) {
      result = Promise.all([page.data.load(), ctx.getLoader()]).then(([renderer, loader]) =>
        renderer.render({
          ...ObsidianComponents,
          ...components,
          a: (props: ComponentProps<'a'>) =>
            createElement(Link, {
              ...props,
              href: props.href && loader.resolveHref(props.href, page),
            }),
        }),
      );
      rendered.set(page.data, result);
    }
    return result;
  }

  return {
    name: 'obsidian',
    async getPageBody(page) {
      if (isVaultPage(page)) return { node: (await render(this, page)).body };
    },
    async getPageToc(page) {
      if (isVaultPage(page)) return (await render(this, page)).toc;
    },
    async getPageStructuredData(page) {
      if (isVaultPage(page)) return page.data.structuredData();
    },
    // from the compiled page, its source has Obsidian syntax and hidden comments
    async getPageText(page) {
      if (!isVaultPage(page)) return;
      const { headings, contents } = await page.data.structuredData();
      const titles = new Map(headings.map((item) => [item.id, item.content]));
      const lines: string[] = [];
      let heading: string | undefined;
      for (const item of contents) {
        if (item.heading !== heading) {
          heading = item.heading;
          const title = heading && titles.get(heading);
          if (title) lines.push(`## ${title}`);
        }
        lines.push(item.content);
      }
      return lines.join('\n\n');
    },
  };
}
