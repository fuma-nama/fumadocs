import type { Root } from 'mdast';
import type { Nodes } from 'hast';
import type { Transformer } from 'unified';
import type { Expression, ExpressionStatement, ObjectExpression, Program } from 'estree';
import { createGenerator, type DocEntry, type Generator } from '@/lib/base';
import { type MarkdownRenderer, markdownRenderer } from '@/markdown';
import { valueToEstree } from 'estree-util-value-to-estree';
import { visit } from 'unist-util-visit';
import { type BaseTypeTableProps, type GenerateTypeTableOptions } from '@/lib/type-table';
import { toEstree } from 'hast-util-to-estree';
import { type ParameterTag, parseTags } from '@/lib/parse-tags';
import type { ResolvedShikiConfig } from 'fumadocs-core/highlight/config';

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
  renderer: MarkdownRenderer,
): Promise<ObjectExpression> {
  async function onItem(entry: DocEntry) {
    const node = objectBuilder();
    const tags = parseTags(entry.tags);
    node.addJsxProperty('type', await renderer.renderTypeToHast(entry.simplifiedType));
    node.addJsxProperty('typeDescription', await renderer.renderTypeToHast(entry.type));
    node.addExpressionNode('required', valueToEstree(entry.required));

    if (tags.default) node.addJsxProperty('default', await renderer.renderTypeToHast(tags.default));

    if (tags.returns)
      node.addJsxProperty('returns', await renderer.renderMarkdownToHast(tags.returns));

    if (tags.params) {
      node.addExpressionNode('parameters', {
        type: 'ArrayExpression',
        elements: await Promise.all(tags.params.map(onParam)),
      });
    }

    if (entry.description) {
      node.addJsxProperty('description', await renderer.renderMarkdownToHast(entry.description));
    }

    return node.build();
  }

  async function onParam(param: ParameterTag) {
    const node = objectBuilder();
    node.addExpressionNode('name', valueToEstree(param.name));
    if (param.description)
      node.addJsxProperty('description', await renderer.renderMarkdownToHast(param.description));

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

  /**
   * config for Shiki when using default `renderMarkdown` & `renderType`.
   */
  shiki?: ResolvedShikiConfig;
  renderMarkdown?: MarkdownRenderer['renderMarkdownToHast'];
  renderType?: MarkdownRenderer['renderTypeToHast'];

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

export interface TypeTableProps extends BaseTypeTableProps {
  cwd?: true;
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
    renderMarkdown,
    renderType,
    shiki,
  } = config;
  let renderer: MarkdownRenderer;

  if (renderMarkdown && renderType) {
    renderer = { renderMarkdownToHast: renderMarkdown, renderTypeToHast: renderType };
  } else {
    renderer = markdownRenderer(shiki);
    if (renderMarkdown) renderer.renderMarkdownToHast = renderMarkdown;
    if (renderType) renderer.renderTypeToHast = renderType;
  }

  return async (tree, file) => {
    const queue: Promise<void>[] = [];
    async function run(node: object, props: TypeTableProps) {
      let basePath = props.cwd ? file.cwd : generateOptions.basePath;
      if (file.dirname) {
        basePath ??= file.dirname;
      }

      const output = await generator.generateTypeTable(props, {
        ...generateOptions,
        basePath,
      });

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
                        expression: await buildTypeProp(doc.entries, renderer),
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

    visit(tree, 'mdxJsxFlowElement', (node) => {
      if (node.name !== name) return;
      const props: Record<string, string | true> = {};
      const onError = (message: string, cause?: Error) => {
        const location = node.position
          ? `${file.path}:${node.position.start.line}:${node.position.start.column}`
          : file.path;
        throw new Error(`${location} from <auto-type-table>: ${message}`, {
          cause,
        });
      };

      for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute') {
          onError('only named attributes are allowed.');
        } else if (typeof attr.value === 'string') {
          props[attr.name] = attr.value;
        } else if (attr.value === null) {
          props[attr.name] = true;
        } else {
          onError('only string & boolean attributes are allowed.');
        }
      }

      queue.push(
        run(node, props).catch((err) => {
          onError('failed to generate type table', err);
        }),
      );
      return 'skip';
    });

    await Promise.all(queue);
  };
}
