import type { Root, RootContent } from 'mdast';
import type { Nodes } from 'hast';
import type { Transformer } from 'unified';
import type { Expression, ExpressionStatement, ObjectExpression } from 'estree';
import { createGenerator, type DocEntry, type GeneratedDoc, type Generator } from '@/lib/base';
import { type MarkdownRenderer, markdownRenderer, type ShikiOptions } from '@/markdown';
import { valueToEstree } from 'estree-util-value-to-estree';
import { type BaseTypeTableProps, type GenerateTypeTableOptions } from '@/lib/type-table';
import { toEstree } from 'hast-util-to-estree';
import { type ParameterTag, parseTags } from '@/lib/parse-tags';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxFlowElement } from 'mdast-util-mdx';
import type { VFile } from 'vfile';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { tableRowToStructuredData } from 'fumadocs-core/search';
import { markdownTable, replaceSource } from 'fumadocs-core/mdx-plugins/stringifier';

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
          type: 'Literal',
          value: key,
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

    if (entry.typeHref)
      node.addExpressionNode('typeDescriptionLink', valueToEstree(entry.typeHref));

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

    if (entry.deprecated) {
      node.addExpressionNode('deprecated', valueToEstree(true));
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
  shiki?: ShikiOptions;
  renderMarkdown?: MarkdownRenderer['renderMarkdownToHast'];
  renderType?: MarkdownRenderer['renderTypeToHast'];

  /**
   * Customize type table generation
   */
  options?: GenerateTypeTableOptions;

  /**
   * generate the stringified form of props (useful for `remark-stringify` etc).
   */
  remarkStringify?: boolean;

  generator?: Generator;
}

/** the structured data of a type table, a table row without header for each prop, linked to the prop */
export function typeTableToStructuredData(
  id: string,
  entries: DocEntry[],
): StructuredData['contents'] {
  const contents: StructuredData['contents'] = [];
  for (const entry of entries) {
    contents.push(
      tableRowToStructuredData({
        table: id,
        heading: `${id}-${entry.name}`,
        row: typeTableRow(entry),
      }),
    );
  }

  return contents;
}

/** a type table as Markdown: a heading, its description, and a table of its props */
export function typeTableToMarkdown(doc: GeneratedDoc): string {
  let out = `### ${doc.name}\n\n`;
  if (doc.description) out += `${doc.description.trim()}\n\n`;
  const rows = [['Prop', 'Type', 'Description']];
  for (const entry of doc.entries) rows.push(typeTableRow(entry));

  return out + markdownTable(rows);
}

function typeTableRow(entry: DocEntry): string[] {
  const tags = parseTags(entry.tags);
  let description = entry.description.replace(/{@link (?<link>[^}]*)}/g, '$1').trim();
  if (tags.default) description += `${description ? ' ' : ''}Default: \`${tags.default}\``;
  if (entry.deprecated) description = `**Deprecated.** ${description}`;

  return [
    `\`${entry.name}${entry.required ? '' : '?'}\``,
    `\`${entry.simplifiedType}\``,
    description,
  ];
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

  async function generate(
    file: VFile,
    props: TypeTableProps,
    attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[],
  ) {
    let basePath = props.cwd ? file.cwd : generateOptions.basePath;
    if (file.dirname) {
      basePath ??= file.dirname;
    }

    const output = await generator.generateTypeTable(props, {
      ...generateOptions,
      basePath,
    });
    const rendered: MdxJsxFlowElement[] = [];

    for (const doc of output) {
      rendered.push({
        type: 'mdxJsxFlowElement',
        name: outputName,
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'id',
            value: `type-table-${doc.id}`,
          },
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
                },
              },
            },
          },
          ...attributes,
        ],
        children: [],
        data: {
          structuredData: {
            contents: typeTableToStructuredData(`type-table-${doc.id}`, doc.entries),
          },
        },
      });
    }

    return { output, rendered };
  }

  return async (tree, file) => {
    const queue: Promise<void>[] = [];

    walk(tree, (node) => {
      if (node.type !== 'mdxJsxFlowElement' || node.name !== name) return;
      const props: TypeTableProps = {};
      const attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[] = [];

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
          attributes.push(attr);
          continue;
        }

        switch (attr.name) {
          case 'cwd':
            props.cwd = true;
            break;
          case 'path':
          case 'name':
          case 'type':
            if (typeof attr.value === 'string') {
              props[attr.name] = attr.value;
            } else {
              onError(
                `invalid type for attribute ${attr.name}: ${typeof attr.value}, expected: string`,
              );
            }
            break;
          default:
            attributes.push(attr);
        }
      }

      queue.push(
        generate(file, props, attributes)
          .then(({ output, rendered }) => {
            let markdown = '';
            for (const doc of output)
              markdown += `${markdown ? '\n\n' : ''}${typeTableToMarkdown(doc)}`;
            replaceSource(file, node, markdown);
            Object.assign(node, { type: 'root', children: rendered } satisfies Root);
          })
          .catch((err) => {
            onError('failed to generate type table', err);
          }),
      );
      return 'skip';
    });

    await Promise.all(queue);
  };
}

/** visit a tree in document order, returning `skip` skips the children of a node */
function walk(
  node: Root | RootContent,
  visitor: (node: Root | RootContent) => 'skip' | void,
): void {
  if (visitor(node) === 'skip' || !('children' in node)) return;
  for (const child of node.children) walk(child, visitor);
}
