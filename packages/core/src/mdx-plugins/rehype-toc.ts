import type { Processor, Transformer } from 'unified';
import type { Root, Element } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { JSXElement } from 'estree-jsx';
import { visit } from 'unist-util-visit';
import { toMdxExportRaw } from './mdast-utils';

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
        if (last.value.endsWith(NoTocTag)) {
          last.value = last.value.substring(0, last.value.length - NoTocTag.length).trimEnd();
          return 'skip';
        }

        if (last.value.endsWith(TocOnlyTag)) {
          isTocOnly = true;
          last.value = last.value.substring(0, last.value.length - TocOnlyTag.length).trimEnd();
        }
      }

      items.push({
        title: element,
        depth: Number(element.tagName[1]),
        url: `#${id}`,
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
          elements: esmItems.map((item) => ({
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
          })),
        }),
      );
    } else {
      file.data.rehypeToc = items;
    }
  };
}
