import { type Transformer } from 'unified';
import { type Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { createElement, expressionToAttribute } from '@/utils';

export interface TypeScriptToJavaScriptOptions {
  /**
   * Persist Tab value (Fumadocs UI only)
   *
   * @defaultValue false
   */
  persist?:
    | {
        id: string;
      }
    | false;

  /**
   * Transform all TypeScript codeblocks by default, without a trigger
   */
  disableTrigger?: boolean;
}

/**
 * A remark plugin to transform TypeScript codeblocks into two tabs of codeblocks with its JS variant.
 *
 * Add `ts2js` to enable transformation:
 * ````md
 * ```tsx ts2js
 * import { ReactNode } from "react";
 *
 * export default function Layout({ children }: { children: ReactNode }) {
 *     return <div>{children}</div>
 * }
 * ```
 * ````
 */
export function remarkTypeScriptToJavaScript({
  persist = false,
  disableTrigger = false,
}: TypeScriptToJavaScriptOptions = {}): Transformer<Root> {
  return async (tree, file) => {
    const oxc = await import('oxc-transform');

    visit(tree, 'code', (node) => {
      if (node.lang !== 'ts' && node.lang !== 'tsx') return;
      if (!disableTrigger && !node.meta?.includes('ts2js')) return;

      const result = oxc.transform(
        `${file.path ?? 'test'}.${node.lang}`,
        node.value,
        {
          sourcemap: false,
          jsx: 'preserve',
        },
      );

      const insert = createElement(
        'Tabs',
        [
          ...(typeof persist === 'object'
            ? [
                {
                  type: 'mdxJsxAttribute',
                  name: 'groupId',
                  value: persist.id,
                },
                {
                  type: 'mdxJsxAttribute',
                  name: 'persist',
                  value: null,
                },
              ]
            : []),
          expressionToAttribute('items', {
            type: 'ArrayExpression',
            elements: ['TypeScript', 'JavaScript'].map((name) => ({
              type: 'Literal',
              value: name,
            })),
          }),
        ],
        [
          {
            type: 'mdxJsxFlowElement',
            name: 'Tab',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'value',
                value: 'TypeScript',
              },
            ],
            children: [
              {
                type: 'code',
                lang: node.lang,
                meta: node.meta,
                value: node.value,
              } satisfies Code,
            ],
          },
          {
            type: 'mdxJsxFlowElement',
            name: 'Tab',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'value',
                value: 'JavaScript',
              },
            ],
            children: [
              {
                type: 'code',
                lang: 'jsx',
                meta: node.meta,
                value: result.code,
              } satisfies Code,
            ],
          },
        ],
      );

      Object.assign(node, insert);
      return 'skip';
    });
  };
}
