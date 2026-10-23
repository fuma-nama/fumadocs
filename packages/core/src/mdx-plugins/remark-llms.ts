import type { Transformer } from 'unified';
import { isJsxElement, toMdxExportRaw } from './utils';
import type { Nodes, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import type { PlaceholderData } from './remark-llms.runtime';
import { createStringifier } from './stringifier';
import { stringifyHeadingId } from './heading-id';
import type {
  Expression,
  JSXAttribute,
  JSXElement,
  JSXFragment,
  JSXSpreadAttribute,
  Program,
  SimpleLiteral,
  Statement,
} from 'estree-jsx';

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
    const collect: Collect = [];
    const s = createStringifier(
      file,
      undefined,
      (expression, fallback) => `\0${collect.push({ expression, fallback }) - 1}\0`,
    );
    // string output only collects expressions, static text (e.g. placeholders) uses their fallbacks
    const toStatic = (text: string) =>
      text.replace(Marker, (_, i: string) => (collect[Number(i)] as { fallback: string }).fallback);

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
        } else if (node.type === 'heading') {
          stringifyHeadingId(s, node, headingIds);
        } else if (isJsxElement(node) && node.name) {
          if (!jsx && mdxAsPlaceholder?.includes(node.name))
            s.replace(node, (s) => toPlaceholder(node, toStatic(s.inner(node))));
          else if (jsx && componentNameRegex.test(node.name))
            s.replace(node, (s) => {
              let children = s.inner(node);
              // block content on its own lines
              if (children && node.type === 'mdxJsxFlowElement') children = `\n${children}\n`;
              return `\0${collect.push({ node, children }) - 1}\0`;
            });
        }
      }
    };

    visit(tree.children);
    const text = s.stringify(tree).trim();
    const value = text ? `${text}\n` : '';
    const chunks = toJsxChunks(value, collect);

    if (jsx) {
      tree.children.unshift(jsxToEstree(as, chunks));
      return;
    }

    tree.children.unshift(toMdxExportRaw(as, concat(chunks as Expression[])));
    if (_data) file.data.markdown = toStatic(value);
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

/** kept JSX elements & expressions, by their markers */
type Collect = (
  | { node: JsxElement; children: string }
  | { expression: Expression; fallback: string }
)[];

interface JsxChunkElement {
  node: JsxElement;
  children: JsxChunk[];
}

type JsxChunk = JsxChunkElement | Expression;

const Marker = /\0(\d+)\0/g;

/**
 * Split stringified Markdown on markers into text literals, kept JSX elements and expressions, recursively for the
 * children of elements.
 */
function toJsxChunks(text: string, collect: Collect): JsxChunk[] {
  const out: JsxChunk[] = [];
  let idx = 0;

  for (const match of text.matchAll(Marker)) {
    if (match.index > idx) out.push(literal(text.slice(idx, match.index)));
    const item = collect[Number(match[1])];
    out.push(
      'node' in item
        ? { node: item.node, children: toJsxChunks(item.children, collect) }
        : item.expression,
    );
    idx = match.index + match[0].length;
  }
  if (idx < text.length) out.push(literal(text.slice(idx)));

  return out;
}

/** the chunks as one string */
function concat(chunks: Expression[]): Expression {
  let out = chunks[0] ?? literal('');
  for (let i = 1; i < chunks.length; i++)
    out = { type: 'BinaryExpression', operator: '+', left: out, right: chunks[i] };

  return out;
}

/**
 * Generate the component export as an ESM node with estree, for the MDX.js compiler.
 */
function jsxToEstree(as: string, chunks: JsxChunk[]): MdxjsEsm {
  const hasJsx = chunks.some((chunk) => 'node' in chunk);
  let value: Expression;
  if (!hasJsx) value = concat(chunks as Expression[]);
  else if (chunks.length === 1) value = elementToEstree(chunks[0] as JsxChunkElement);
  else {
    value = {
      type: 'JSXFragment',
      openingFragment: { type: 'JSXOpeningFragment' },
      closingFragment: { type: 'JSXClosingFragment' },
      children: childrenToEstree(chunks),
    };
  }

  const body: Statement[] = [
    {
      type: 'IfStatement',
      test: {
        type: 'UnaryExpression',
        operator: '!',
        prefix: true,
        argument: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: '_asMarkdown' },
          arguments: [],
          optional: false,
        },
      },
      consequent: { type: 'ReturnStatement', argument: literal(null) },
      alternate: null,
    },
  ];
  if (hasJsx) {
    body.push({
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: '_c' },
          init: {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: '_jsxComponents' },
            arguments: [
              {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: 'props' },
                property: { type: 'Identifier', name: 'components' },
                computed: false,
                optional: false,
              },
            ],
            optional: false,
          },
        },
      ],
    });
  }
  body.push({ type: 'ReturnStatement', argument: value });

  const program: Program = {
    type: 'Program',
    sourceType: 'module',
    body: [
      {
        type: 'ImportDeclaration',
        attributes: [],
        specifiers: [
          {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'asMarkdown' },
            local: { type: 'Identifier', name: '_asMarkdown' },
          },
          ...(hasJsx
            ? [
                {
                  type: 'ImportSpecifier',
                  imported: { type: 'Identifier', name: 'jsxComponents' },
                  local: { type: 'Identifier', name: '_jsxComponents' },
                } as const,
              ]
            : []),
        ],
        source: literal('fumadocs-core/server'),
      },
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
  };

  return { type: 'mdxjsEsm', value: '', data: { estree: program } };
}

function literal(value: string | null): SimpleLiteral {
  return { type: 'Literal', value };
}

function childrenToEstree(chunks: JsxChunk[]): JSXFragment['children'] {
  const out: JSXFragment['children'] = [];
  for (const chunk of chunks) {
    out.push(
      'node' in chunk
        ? elementToEstree(chunk)
        : { type: 'JSXExpressionContainer', expression: chunk },
    );
  }

  return out;
}

function elementToEstree({ node, children }: JsxChunkElement): JSXElement {
  const attributes: (JSXAttribute | JSXSpreadAttribute)[] = [];
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') {
      const expression = programExpression(attr.data?.estree);
      if (
        expression?.type === 'ObjectExpression' &&
        expression.properties.length === 1 &&
        expression.properties[0].type === 'SpreadElement'
      ) {
        attributes.push({
          type: 'JSXSpreadAttribute',
          argument: expression.properties[0].argument,
        });
      }
      continue;
    }

    let value: JSXAttribute['value'] = null;
    if (typeof attr.value === 'string') {
      value = { type: 'Literal', value: attr.value };
    } else if (attr.value) {
      const expression = programExpression(attr.value.data?.estree);
      if (!expression) continue;
      value = { type: 'JSXExpressionContainer', expression };
    }

    attributes.push({
      type: 'JSXAttribute',
      name: attr.name.includes(':')
        ? {
            type: 'JSXNamespacedName',
            namespace: { type: 'JSXIdentifier', name: attr.name.slice(0, attr.name.indexOf(':')) },
            name: { type: 'JSXIdentifier', name: attr.name.slice(attr.name.indexOf(':') + 1) },
          }
        : { type: 'JSXIdentifier', name: attr.name },
      value,
    });
  }

  const name = {
    type: 'JSXMemberExpression',
    object: { type: 'JSXIdentifier', name: '_c' },
    property: { type: 'JSXIdentifier', name: node.name! },
  } as const;
  const element: JSXElement = {
    type: 'JSXElement',
    openingElement: {
      type: 'JSXOpeningElement',
      name,
      attributes,
      selfClosing: children.length === 0,
    },
    closingElement: children.length === 0 ? null : { type: 'JSXClosingElement', name },
    children: childrenToEstree(children),
  };
  if (node.type === 'mdxJsxFlowElement') return element;

  // keep inline elements in inline context when rendered
  return {
    type: 'JSXElement',
    openingElement: {
      type: 'JSXOpeningElement',
      name: { type: 'JSXIdentifier', name: 'span' },
      attributes: [],
      selfClosing: false,
    },
    closingElement: { type: 'JSXClosingElement', name: { type: 'JSXIdentifier', name: 'span' } },
    children: [element],
  };
}

function programExpression(program: Program | null | undefined): Expression | undefined {
  const statement = program?.body[0];
  if (statement?.type === 'ExpressionStatement') return statement.expression;
}
