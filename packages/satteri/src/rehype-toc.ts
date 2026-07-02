import { defineHastPlugin, type HastPluginDefinition } from 'satteri';
import type { Element } from 'hast';
import { handleTag } from '@/utils';
import type { TocJsxExportItem } from '@/data-map';

export interface RehypeTocOptions {
  exportToc?:
    | boolean
    | { as: 'data' }
    | {
        as: 'esm';
        name: string;
      };
}

const TocOnlyTag = '[toc]';
const NoTocTag = '[!toc]';
const HeadingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export function rehypeToc({ exportToc = true }: RehypeTocOptions = {}): HastPluginDefinition | (() => HastPluginDefinition) {
  if (exportToc === false) {
    return defineHastPlugin({ name: 'rehype-toc' });
  }

  const resolved = exportToc === true ? { as: 'esm' as const, name: 'toc' } : exportToc;

  return () => {
    const items: TocJsxExportItem[] = [];

    return defineHastPlugin({
      name: 'rehype-toc',
      element: {
        filter: [...HeadingTags],
        visit(node, ctx) {
          const element = node as Element;
          if (element.children.length === 0) return;

          const id = element.properties.id;
          if (typeof id !== 'string') return;

          let isTocOnly = false;
          const last = element.children[element.children.length - 1];
          if (last?.type === 'text') {
            const noToc = handleTag(last.value, NoTocTag);
            if (noToc !== false) {
              ctx.setProperty(last, 'value', noToc);
              return;
            }

            const tocOnly = handleTag(last.value, TocOnlyTag);
            if (tocOnly !== false) {
              isTocOnly = true;
              ctx.setProperty(last, 'value', tocOnly);
            }
          }

          items.push({
            title: ctx.textContent(element),
            depth: Number(element.tagName[1]),
            url: `#${id}`,
            _step:
              typeof element.properties['data-fd-step'] === 'number'
                ? element.properties['data-fd-step']
                : undefined,
          });

          if (isTocOnly) ctx.removeNode(element);

          if (resolved.as === 'esm') {
            ctx.data._tocEsmExport = { name: resolved.name, items };
          } else {
            ctx.data.rehypeToc = items;
          }
        },
      },
    });
  };
}

export type { TocJsxExportItem as RehypeTOCItemType } from '@/data-map';
