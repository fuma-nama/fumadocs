import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import type {
  ExpressionStatement,
  ObjectExpression,
  Program,
  Property,
} from 'estree';
import { createGenerator, type DocEntry, type Generator } from '@/lib/base';
import { renderMarkdownToHast } from '@/markdown';
import { valueToEstree } from 'estree-util-value-to-estree';
import { visit } from 'unist-util-visit';
import {
  type BaseTypeTableProps,
  type GenerateTypeTableOptions,
} from '@/lib/type-table';
import { toEstree } from 'hast-util-to-estree';
import { dirname } from 'node:path';

async function mapProperty(
  entry: DocEntry,
  renderMarkdown: typeof renderMarkdownToHast,
): Promise<Property> {
  const value = valueToEstree({
    type: entry.type,
    default: entry.tags.default || entry.tags.defaultValue,
    required: entry.required,
  }) as ObjectExpression;

  if (entry.description) {
    const hast = toEstree(await renderMarkdown(entry.description), {
      elementAttributeNameCase: 'react',
    }).body[0] as ExpressionStatement;

    value.properties.push({
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      key: {
        type: 'Identifier',
        name: 'description',
      },
      kind: 'init',
      value: hast.expression,
    });
  }

  return {
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    key: {
      type: 'Literal',
      value: entry.name,
    },
    kind: 'init',
    value,
  };
}

export interface RemarkAutoTypeTableOptions {
  /**
   * @defaultValue 'auto-type-table'
   */
  name?: string;

  /**
   * @defaultValue 'TypeTable'
   */
  outputName?: string;

  renderMarkdown?: typeof renderMarkdownToHast;

  /**
   * Customise type table generation
   */
  options?: GenerateTypeTableOptions;

  /**
   * generate required `value` property for `remark-stringify`
   */
  remarkStringify?: boolean;

  generator?: Generator;
}

/**
 * Compile `auto-type-table` into Fumadocs UI compatible TypeTable
 *
 * MDX is required to use this plugin.
 */
export function remarkAutoTypeTable({
  name = 'auto-type-table',
  outputName = 'TypeTable',
  renderMarkdown = renderMarkdownToHast,
  options = {},
  remarkStringify = true,
  generator = createGenerator(),
}: RemarkAutoTypeTableOptions = {}): Transformer<Root, Root> {
  return async (tree, file) => {
    const queue: Promise<void>[] = [];
    let basePath = options?.basePath;
    if (!basePath && file.path) basePath = dirname(file.path);

    visit(tree, 'mdxJsxFlowElement', (node) => {
      if (node.name !== name) return;
      const props: Record<string, string> = {};

      for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute' || typeof attr.value !== 'string')
          throw new Error(
            '`auto-type-table` does not support non-string attributes',
          );

        props[attr.name] = attr.value;
      }

      async function run() {
        const output = await generator.generateTypeTable(
          props as BaseTypeTableProps,
          {
            ...options,
            basePath,
          },
        );

        const rendered = output.map(async (doc) => {
          const properties = await Promise.all(
            doc.entries.map((entry) => mapProperty(entry, renderMarkdown)),
          );

          return {
            type: 'mdxJsxFlowElement',
            name: outputName,
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'type',
                value: {
                  type: 'mdxJsxAttributeValueExpression',
                  value: remarkStringify ? JSON.stringify(doc, null, 2) : '',
                  data: {
                    estree: {
                      type: 'Program',
                      sourceType: 'module',
                      body: [
                        {
                          type: 'ExpressionStatement',
                          expression: {
                            type: 'ObjectExpression',
                            properties,
                          },
                        },
                      ],
                    } satisfies Program,
                  },
                },
              },
            ],
            children: [],
          };
        });

        Object.assign(node, {
          type: 'root',
          attributes: [],
          children: await Promise.all(rendered),
        } as Root);
      }

      queue.push(run());
      return 'skip';
    });

    await Promise.all(queue);
  };
}
