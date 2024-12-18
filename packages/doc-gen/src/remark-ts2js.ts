import { Transformer } from 'unified';
import { type Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { transform, Options as SWCOptions } from '@swc/wasm-typescript';
import { createElement, expressionToAttribute } from '@/utils';

export interface TypeScriptToJavaScriptOptions {
  swc?: SWCOptions;
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
}

export function remarkTs2js({
  swc = {},
  persist = false,
}: TypeScriptToJavaScriptOptions = {}): Transformer<Root> {
  return async (tree, file) => {
    const queue: Promise<void>[] = [];

    visit(tree, 'code', (node) => {
      if (node.lang !== 'ts' && node.lang !== 'tsx') return;

      const task = transform(node.value, {
        filename: `${file.path}.${node.lang}`,
        transform: {
          importExportAssignConfig: 'Preserve',
          verbatimModuleSyntax: true,
        },
        sourceMap: false,
        ...swc,
      })
        .then((output) => {
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
                    value: output.code,
                  } satisfies Code,
                ],
              },
            ],
          );

          Object.assign(node, insert);
        })
        .catch((e) => {
          // ignore node
          console.error(e);
        });

      queue.push(task);
    });

    await Promise.all(queue);
  };
}
