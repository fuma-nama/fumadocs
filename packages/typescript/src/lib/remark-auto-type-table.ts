import type { Root } from 'mdast';
import type { Nodes } from 'hast';
import type { Transformer } from 'unified';
import type {
  Expression,
  ExpressionStatement,
  ObjectExpression,
  Program,
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
import { type ParameterTag, parseTags } from '@/lib/parse-tags';

function objectBuilder() {
  const out: ObjectExpression = {
    type: 'ObjectExpression',
    properties: [],
  };

  return {
    addExpressionNode(key: string, expression: Expression) {
      out.properties.push({
        type: 'Property',
        method: false,
        shorthand: false,
        computed: false,
        key: {
          type: 'Identifier',
          name: key,
        },
        kind: 'init',
        value: expression,
      });
    },
    addJsxProperty(key: string, hast: Nodes) {
      const estree = toEstree(hast, {
        elementAttributeNameCase: 'react',
      }).body[0] as ExpressionStatement;

      this.addExpressionNode(key, estree.expression);
    },
    build() {
      return out;
    },
  };
}

async function buildTypeProp(
  entries: DocEntry[],
  {
    renderMarkdown = renderMarkdownToHast,
    renderType = renderTypeToHast,
  }: RemarkAutoTypeTableOptions,
): Promise<ObjectExpression> {
  async function onItem(entry: DocEntry) {
    const node = objectBuilder();
    node.addJsxProperty('type', await renderType(entry.simplifiedType));
    node.addJsxProperty('typeDescription', await renderType(entry.type));
    node.addExpressionNode('required', valueToEstree(entry.required));

    const tags = parseTags(entry.tags);
    if (tags.default)
      node.addJsxProperty('default', await renderType(tags.default));

    if (tags.returns)
      node.addJsxProperty('returns', await renderMarkdown(tags.returns));

    if (tags.params) {
      node.addExpressionNode('parameters', {
        type: 'ArrayExpression',
        elements: await Promise.all(tags.params.map(onParam)),
      });
    }

    if (entry.description) {
      node.addJsxProperty(
        'description',
        await renderMarkdown(entry.description),
      );
    }

    return node.build();
  }

  async function onParam(param: ParameterTag) {
    const node = objectBuilder();
    node.addExpressionNode('name', valueToEstree(param.name));
    if (param.description)
      node.addJsxProperty(
        'description',
        await renderMarkdown(param.description),
      );

    return node.build();
  }

  const prop = objectBuilder();
  const output = await Promise.all(
    entries.map(async (entry) => ({
      name: entry.name,
      node: await onItem(entry),
    })),
  );

  for (const node of output) {
    prop.addExpressionNode(node.name, node.node);
  }

  return prop.build();
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
                          expression: await buildTypeProp(doc.entries, config),
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
