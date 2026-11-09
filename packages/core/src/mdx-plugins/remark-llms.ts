import type { Transformer } from 'unified';
import {
  type Chunk,
  chunksToExpression,
  createCodeOutput,
  isJsxElement,
  toMdxExportRaw,
  toMdxImport,
} from './utils';
import type { Nodes, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import type { PlaceholderData } from './remark-llms.runtime';
import { stringifyHeadingId } from './heading-id';
import type { Expression, Statement } from 'estree-jsx';

export interface LLMsOptions {
  /**
   * export name for output Markdown.
   *
   * @default _markdown
   */
  as?: string;

  /**
   * Explicit heading IDs in output.
   *
   * @default true
   */
  headingIds?: boolean;

  /**
   * Filter the elements to be included in the output:
   *
   * - `true`: include element & its children.
   * - `children-only`: exclude element but keep its children.
   * - `false`: exclude element & its children.
   *
   * ESM nodes are always excluded.
   */
  filterElement?: (node: Nodes) => boolean | 'children-only';

  /**
   * Tag names of MDX components to be output as placeholders, render them with `renderPlaceholder()`.
   *
   * Ignored with `output: 'function'`.
   */
  mdxAsPlaceholder?: string[];

  /**
   * Form of the export:
   *
   * - `string`: the output Markdown.
   * - `function`: a component: Markdown content is kept as authored, while JSX elements are
   *   kept as JSX, receiving their original props and resolving from `props.components`.
   *   Render it with `renderToMarkdown` from `fumadocs-core/server`, where a component
   *   can call `asMarkdown()` to define its own Markdown form.
   *
   * @default string
   */
  output?: 'function' | 'string';

  /**
   * @internal output in file data, unavailable with `output: 'function'`
   */
  _data?: boolean;
}

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

const componentNameRegex = /^[A-Z][\w$]*$/;

/**
 * Generate Markdown for LLMs from the authored source, other plugins can edit it with
 * `replaceSource()` from `fumadocs-core/mdx-plugins/stringifier`.
 *
 * Authored expressions and the branches of `<show>` checked when rendering are rendered from code, the export is then a
 * component of the props in both forms.
 */
export function remarkLLMs({
  as = '_markdown',
  headingIds = true,
  _data = false,
  mdxAsPlaceholder,
  output = 'string',
  filterElement,
}: LLMsOptions = {}): Transformer<Root, Root> {
  const jsx = output === 'function';

  return (tree, file) => {
    const out = createCodeOutput(file);
    const { s } = out;

    const visit = (nodes: Nodes[]) => {
      for (const node of nodes) {
        const visibility = node.type === 'mdxjsEsm' ? false : (filterElement?.(node) ?? true);
        if (visibility === false) {
          s.replace(node, '');
          continue;
        }

        if ('children' in node) visit(node.children);
        if (visibility === 'children-only') {
          s.replace(node, (s) => s.inner(node));
        } else if (out.markCode(node)) {
          // rendered from code
        } else if (node.type === 'heading') {
          stringifyHeadingId(s, node, headingIds);
        } else if (isJsxElement(node) && node.name) {
          if (!jsx && mdxAsPlaceholder?.includes(node.name))
            s.replace(node, (s) => toPlaceholder(node, out.toStatic(s.inner(node))));
          else if (jsx && componentNameRegex.test(node.name))
            s.replace(node, (s) => {
              let children = s.inner(node);
              // block content on its own lines
              if (children && node.type === 'mdxJsxFlowElement') children = `\n${children}\n`;
              return out.wrap({ element: node }, children);
            });
        }
      }
    };

    visit(tree.children);
    const text = s.stringify(tree).trim();
    const value = text ? `${text}\n` : '';
    const chunks = out.chunks(value);

    if (jsx || out.dynamic) {
      tree.children.unshift(...componentToEsm(as, chunks));
    } else {
      tree.children.unshift(toMdxExportRaw(as, concat(chunks)));
    }
    if (_data) file.data.markdown = out.toStatic(value);
  };
}

function toPlaceholder(node: JsxElement, children: string): string {
  const attributes: Record<string, unknown> = {};
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') continue;
    attributes[attr.name] = attr.value;
  }

  return `\0${JSON.stringify({
    name: node.name,
    children,
    attributes,
  } satisfies PlaceholderData)}\0`;
}

/** the chunks as one string, they have no elements or branches */
function concat(chunks: Chunk[]): Expression {
  let out: Expression | undefined;
  for (const chunk of chunks) {
    const value: Expression =
      typeof chunk === 'string'
        ? { type: 'Literal', value: chunk }
        : (chunk as { expression: Expression }).expression;
    out = out ? { type: 'BinaryExpression', operator: '+', left: out, right: value } : value;
  }

  return out ?? { type: 'Literal', value: '' };
}

function hasElement(chunks: Chunk[]): boolean {
  return chunks.some(
    (chunk) =>
      typeof chunk !== 'string' &&
      ('element' in chunk || ('children' in chunk && hasElement(chunk.children))),
  );
}

/**
 * The component export of Markdown rendered from code, rendered with `renderToMarkdown()` of `fumadocs-core/server`.
 */
function componentToEsm(as: string, chunks: Chunk[]): MdxjsEsm[] {
  const elements = hasElement(chunks);
  const call = (name: string, args: Expression[] = []): Expression => ({
    type: 'CallExpression',
    callee: { type: 'Identifier', name },
    arguments: args,
    optional: false,
  });
  const body: Statement[] = [
    {
      type: 'ReturnStatement',
      argument: {
        type: 'ConditionalExpression',
        test: call('_asMarkdown'),
        consequent: chunksToExpression(chunks),
        alternate: { type: 'Literal', value: null },
      },
    },
  ];
  // the components of kept elements, from `props.components`
  if (elements)
    body.unshift({
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: '_c' },
          init: call('_jsxComponents', [
            {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'props' },
              property: { type: 'Identifier', name: 'components' },
              computed: false,
              optional: false,
            },
          ]),
        },
      ],
    });

  const names: [string, string][] = [['asMarkdown', '_asMarkdown']];
  if (elements) names.push(['jsxComponents', '_jsxComponents']);
  return [
    toMdxImport('fumadocs-core/server', names),
    {
      type: 'mdxjsEsm',
      value: '',
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ExportNamedDeclaration',
              attributes: [],
              specifiers: [],
              declaration: {
                type: 'FunctionDeclaration',
                id: { type: 'Identifier', name: as },
                params: [{ type: 'Identifier', name: 'props' }],
                body: { type: 'BlockStatement', body },
              },
            },
          ],
        },
      },
    },
  ];
}
