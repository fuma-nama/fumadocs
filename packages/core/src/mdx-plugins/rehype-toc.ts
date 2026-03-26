import type { Processor, Transformer } from 'unified';
import type { Root, Element } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { JSXElement, ObjectExpression } from 'estree-jsx';
import { visit } from 'unist-util-visit';
import { handleTag, toMdxExportRaw } from './utils';

export interface RehypeTocOptions {
  /**
   * Export the generated toc.
   *
   * - `true` (default): as an ESM export named `toc`.
   * - `false`: disable the plugin.
   */
  exportToc?:
    | boolean
    | {
        /**
         * generate to `file.data.rehypeToc`.
         */
        as: 'data';
      }
    | {
        /**
         * generate as an ESM export.
         */
        as: 'esm';
        name: string;
      };
}

declare module 'vfile' {
  interface DataMap {
    /**
     * [Fumadocs: rehype-toc] output data.
     */
    rehypeToc?: RehypeTOCItemType[];
  }
}

export interface RehypeTOCItemType {
  /**
   * the original heading tag
   */
  title: Element;
  url: string;
  depth: number;
  _step?: number;
}

const TocOnlyTag = '[toc]';
const NoTocTag = '[!toc]';
const HeadingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export function rehypeToc(
  this: Processor,
  { exportToc = true }: RehypeTocOptions = {},
): Transformer<Root, Root> {
  if (exportToc === true) {
    exportToc = { as: 'esm', name: 'toc' };
  }

  if (exportToc === false) {
    return () => undefined;
  }

  return (tree, file) => {
    const items: RehypeTOCItemType[] = [];

    visit(tree, 'element', (element, idx, parent) => {
      if (!HeadingTags.has(element.tagName) || element.children.length === 0) return;

      const id = element.properties.id;
      if (typeof id !== 'string') return 'skip';
      let isTocOnly = false;

      const last = element.children[element.children.length - 1];
      if (last.type === 'text') {
        const noToc = handleTag(last.value, NoTocTag);

        if (noToc !== false) {
          last.value = noToc;
          return 'skip';
        }

        const tocOnly = handleTag(last.value, TocOnlyTag);
        if (tocOnly !== false) {
          isTocOnly = true;
          last.value = tocOnly;
        }
      }

      items.push({
        title: element,
        depth: Number(element.tagName[1]),
        url: `#${id}`,
        _step:
          typeof element.properties['data-fd-step'] === 'number'
            ? element.properties['data-fd-step']
            : undefined,
      });

      if (isTocOnly && parent && typeof idx === 'number') {
        parent.children.splice(idx, 1);
      }

      return 'skip';
    });

    if (exportToc.as === 'esm') {
      const esmItems: {
        title: JSXElement;
        url: string;
        depth: number;
        _step?: number;
      }[] = [];
      for (const item of items) {
        const root = toEstree(item.title, {
          elementAttributeNameCase: 'react',
          stylePropertyNameCase: 'dom',
        }).body[0];

        if (root.type === 'ExpressionStatement' && root.expression.type === 'JSXElement') {
          esmItems.push({
            ...item,
            title: root.expression,
          });
        }
      }

      tree.children.push(
        toMdxExportRaw(exportToc.name, {
          type: 'ArrayExpression',
          elements: esmItems.map((item) => {
            const obj: ObjectExpression = {
              type: 'ObjectExpression',
              properties: [
                {
                  type: 'Property',
                  method: false,
                  shorthand: false,
                  computed: false,
                  key: {
                    type: 'Identifier',
                    name: 'depth',
                  },
                  value: {
                    type: 'Literal',
                    value: item.depth,
                  },
                  kind: 'init',
                },
                {
                  type: 'Property',
                  method: false,
                  shorthand: false,
                  computed: false,
                  key: {
                    type: 'Identifier',
                    name: 'url',
                  },
                  value: {
                    type: 'Literal',
                    value: item.url,
                  },
                  kind: 'init',
                },
                {
                  type: 'Property',
                  method: false,
                  shorthand: false,
                  computed: false,
                  key: {
                    type: 'Identifier',
                    name: 'title',
                  },
                  value: {
                    type: 'JSXFragment',
                    openingFragment: { type: 'JSXOpeningFragment' },
                    closingFragment: { type: 'JSXClosingFragment' },
                    children: item.title.children,
                  },
                  kind: 'init',
                },
              ],
            };

            if (typeof item._step === 'number') {
              obj.properties.push({
                type: 'Property',
                method: false,
                shorthand: false,
                computed: false,
                key: {
                  type: 'Identifier',
                  name: '_step',
                },
                value: {
                  type: 'Literal',
                  value: item._step,
                },
                kind: 'init',
              });
            }

            return obj;
          }),
        }),
      );
    } else {
      file.data.rehypeToc = items;
    }
  };
}
