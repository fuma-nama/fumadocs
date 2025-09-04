import type { Root } from 'mdast';
import type { Nodes } from 'hast';
import type { Transformer } from 'unified';
import type {
  ExpressionStatement,
  ObjectExpression,
  Program,
  Property,
} from 'estree';
import { createGenerator, type DocEntry, type Generator } from '@/lib/base';
import { renderMarkdownToHast, renderTypeToHast } from '@/markdown';
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
  {
    renderMarkdown = renderMarkdownToHast,
    renderType = renderTypeToHast,
  }: RemarkAutoTypeTableOptions,
): Promise<Property> {
  const value = valueToEstree({
    required: entry.required,
  }) as ObjectExpression;

  function addJsxProperty(key: string, hast: Nodes) {
    const estree = toEstree(hast, {
      elementAttributeNameCase: 'react',
    }).body[0] as ExpressionStatement;

    value.properties.push({
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      key: {
        type: 'Identifier',
        name: key,
      },
      kind: 'init',
      value: estree.expression,
    });
  }

  addJsxProperty('type', await renderType(entry.simplifiedType));
  addJsxProperty('typeDescription', await renderType(entry.type));
  const defaultValue = entry.tags.default ?? entry.tags.defaultValue;
  if (defaultValue) addJsxProperty('default', await renderType(defaultValue));

  if (entry.description) {
    addJsxProperty('description', await renderMarkdown(entry.description));
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
  renderType?: typeof renderTypeToHast;

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
export function remarkAutoTypeTable(
  config: RemarkAutoTypeTableOptions = {},
): Transformer<Root, Root> {
  const {
    name = 'auto-type-table',
    outputName = 'TypeTable',
    options: generateOptions = {},
    remarkStringify = true,
    generator = createGenerator(),
  } = config;

  return async (tree, file) => {
    const queue: Promise<void>[] = [];
    const defaultBasePath = file.path ? dirname(file.path) : undefined;

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
            ...generateOptions,
            basePath: generateOptions.basePath ?? defaultBasePath,
          },
        );

        const rendered = output.map(async (doc) => {
          const properties = await Promise.all(
            doc.entries.map((entry) => mapProperty(entry, config)),
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
