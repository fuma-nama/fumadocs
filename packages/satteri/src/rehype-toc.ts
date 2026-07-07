import { defineHastPlugin, type HastPluginInput } from 'satteri';
import type { Element } from 'hast';
import { handleTag, jsxToSource } from '@/utils';
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
  const plugin: HastPluginInput & ExtraPluginHooks = () => {
    const items: string[] = [];

    return {
      name: 'rehype-toc',

      element: {
        filter: HeadingTags,
        visit(node, ctx) {
          const element = node as Element;
          if (element.children.length === 0) return;

          const id = element.properties.id;
          if (typeof id !== 'string') return;

          let isTocOnly = false;
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
              // update the JS-view such that `jsxToSource()` below generates the right output
              last.value = tocOnly;
              ctx.setProperty(last, 'value', tocOnly);
            }
          }

          if (isTocOnly) ctx.removeNode(element);

          const step =
            typeof element.properties['data-fd-step'] === 'number'
              ? element.properties['data-fd-step']
              : undefined;
          if (resolved.as === 'esm') {
            let root = ctx.parent(node);
            while (root) {
              const next = ctx.parent(root);
              if (!next) break;
              root = next;
            }
            if (!root) return;

            let obj = '{';
            obj += `title: ${jsxToSource({
              type: 'root',
              children: element.children,
            })},`;
            obj += `url: ${JSON.stringify(`#${id}`)},`;
            obj += `depth: ${JSON.stringify(Number(element.tagName[1]))},`;
            if (step !== undefined) obj += `_step: ${JSON.stringify(step)},`;
            obj += '}';

            items.push(obj);
            ctx.setProperty(root, 'children', [
              {
                type: 'mdxjsEsm',
                value: `export const ${resolved.name} = [${items.join(',')}]`,
              },
              ...root.children,
            ]);
            return;
          }

          ctx.data.rehypeToc?.push({
            title,
            depth: Number(element.tagName[1]),
            url: `#${id}`,
            _step: step,
          });
        },
      },
    };
  };
  if (resolved.as === 'data') {
    plugin.beforeToJs = ({ data }) => {
      data.rehypeToc ??= [];
    };
  }
  return plugin;
}
