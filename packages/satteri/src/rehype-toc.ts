import { defineHastPlugin, type HastPluginInput } from 'satteri';
import type { Element } from 'hast';
import { handleTag } from '@/utils';
import type { ExtraPluginHooks } from './compile';

export interface RehypeTocOptions {
  exportToc?:
    | boolean
    | { as: 'data' }
    | {
        as: 'esm';
        name: string;
      };
}

export interface RehypeTocItemType {
  title: string;
  url: string;
  depth: number;
  _step?: number;
}

export interface RehypeTocESMItemType {
  title: Element;
  url: string;
  depth: number;
  _step?: number;
}

const TocOnlyTag = '[toc]';
const NoTocTag = '[!toc]';
const HeadingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export function rehypeToc({ exportToc = true }: RehypeTocOptions = {}): HastPluginInput &
  ExtraPluginHooks {
  if (exportToc === false) {
    return defineHastPlugin({ name: 'rehype-toc' });
  }

  const resolved = exportToc === true ? { as: 'esm' as const, name: 'toc' } : exportToc;

  return {
    name: 'rehype-toc',
    beforeToJs({ data }) {
      if (resolved.as === 'esm') {
        data._tocEsmExport ??= { name: resolved.name, items: [] };
      } else {
        data.rehypeToc ??= [];
      }
    },
    element: {
      filter: HeadingTags,
      visit(node, ctx) {
        const element = node as Element;
        if (element.children.length === 0) return;

        const id = element.properties.id;
        if (typeof id !== 'string') return;

        let isTocOnly = false;
        // `setProperty` is applied after the pass, so strip the tag from the
        // flattened title manually — `ctx.textContent` would still see the
        // original value.
        let title = ctx.textContent(element);
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
            title = title.slice(0, title.length - last.value.length) + tocOnly;
            ctx.setProperty(last, 'value', tocOnly);
          }
        }

        const step =
          typeof element.properties['data-fd-step'] === 'number'
            ? element.properties['data-fd-step']
            : undefined;
        if (resolved.as === 'esm') {
          ctx.data._tocEsmExport?.items.push({
            title: structuredClone(element),
            depth: Number(element.tagName[1]),
            url: `#${id}`,
            _step: step,
          });
        } else {
          ctx.data.rehypeToc?.push({
            title,
            depth: Number(element.tagName[1]),
            url: `#${id}`,
            _step: step,
          });
        }

        if (isTocOnly) ctx.removeNode(element);
      },
    },
  };
}
