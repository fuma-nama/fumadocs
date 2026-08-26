import type { Processor, Transformer } from 'unified';
import { toMdxExport } from './utils';
import type { Heading, Nodes, Parents, Root } from 'mdast';
import { defaultStringifier, type StringifyOptions } from './stringifier';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import { defaultHandlers, type Info, type State } from 'mdast-util-to-markdown';
import type { PlaceholderData } from './remark-llms.runtime';
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

export interface LLMsOptions extends StringifyOptions {
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
   * Default:
   *
   * ```ts
   * filterElement = (node) => {
   *   switch (node.type) {
   *     case 'mdxjsEsm':
   *       return false;
   *     default:
   *       return true;
   *   }
   * },
   * ```
   */
  filterElement?: StringifyOptions['filterElement'];

  /**
   * Tag names of MDX components to be stringified as `placeholder()`, you can also use `placeholder()` directly in `stringify` callback.
   *
   * Ignored when `jsx` is enabled.
   */
  mdxAsPlaceholder?: string[];

  /**
   * Export a component instead of a string: Markdown content is stringified at compile time,
   * while JSX elements are kept as JSX, receiving their original props and resolving from `props.components`.
   *
   * Render the component with `renderToMarkdown` from `fumadocs-core/server`, where a component
   * can call `asMarkdown()` to define its own Markdown form.
   */
  jsx?: boolean;

  /**
   * @private output in file data, unavailable with `jsx`
   */
  _data?: boolean;
}

/**
 * generate `llms.txt` for markdown.
 */
export function remarkLLMs(
  this: Processor,
  {
    as = '_markdown',
    headingIds = true,
    _data = false,
    mdxAsPlaceholder,
    jsx = false,
    ...rest
  }: LLMsOptions = {},
): Transformer<Root, Root> {
  const stringifier = defaultStringifier<JsxCollect | undefined>({
    ...rest,
    filterElement(node) {
      switch (node.type) {
        case 'mdxjsEsm':
          return false;
        default:
          return true;
      }
    },
    stringify(node, parent, state, info, collect) {
      if (mdxAsPlaceholder && !collect) {
        switch (node.type) {
          case 'mdxJsxFlowElement':
          case 'mdxJsxTextElement':
            if (node.name && mdxAsPlaceholder.includes(node.name))
              return placeholder(node, parent, state, info);
        }
      }

      const custom = rest.stringify?.(node, parent, state, info, undefined);
      if (custom) return custom;
      if (collect) return collectJsx(node, state, info, collect);
    },
    handlers: {
      heading(node: Heading, _p, state, info) {
        const id = node.data?.hProperties?.id;
        const defaultValue = defaultHandlers.heading(node, _p, state, info);
        return headingIds && id ? `${defaultValue} [#${id}]` : defaultValue;
      },
      ...rest.handlers,
    },
  });

  return (node, file) => {
    if (jsx) {
      const collect: JsxCollect = [];
      const text = stringifier.call(this, node, collect);
      node.children.unshift(jsxToEstree(as, toJsxChunks(text, collect)));
      return;
    }

    const value = stringifier.call(this, node, undefined);
    node.children.unshift(toMdxExport(as, value));
    if (_data) file.data.markdown = value;
  };
}

/**
 * Preserve AST data to render the MDX component at runtime, use `renderPlaceholder()` to render the placeholders.
 */
export function placeholder(
  node: MdxJsxTextElement | MdxJsxFlowElement,
  _parent: Parents | undefined,
  state: State,
  info: Info,
) {
  const attributes: Record<string, unknown> = {};
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') continue;
    attributes[attr.name] = attr.value;
  }

  return `\0${JSON.stringify({
    name: node.name,
    children: state.containerPhrasing(node, info),
    attributes,
  } satisfies PlaceholderData)}\0`;
}

type JsxCollect = { node: MdxJsxFlowElement | MdxJsxTextElement; children: string }[];

interface JsxChunkElement {
  node: MdxJsxFlowElement | MdxJsxTextElement;
  children: JsxChunk[];
}

type JsxChunk = string | JsxChunkElement;

/**
 * `stringify` branch for the `jsx` option: collect the element and return a marker,
 * resolved later by `toJsxChunks()`. Only components (capitalized names) are kept.
 */
function collectJsx(
  node: Nodes,
  state: State,
  info: Info,
  collect: JsxCollect,
): string | undefined {
  switch (node.type) {
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement': {
      if (!node.name || !/^[A-Z][\w$]*$/.test(node.name)) return;

      const entry = { node, children: '' };
      const marker = `\0${collect.push(entry) - 1}\0`;
      entry.children =
        node.type === 'mdxJsxTextElement'
          ? state.containerPhrasing(node, info)
          : state.containerFlow(node, info);
      return marker;
    }
  }
}

const Marker = /\0(\d+)\0/g;

/**
 * Split stringified Markdown on the markers emitted by `collectJsx()` into
 * alternating text chunks and kept JSX elements, recursively for their children.
 */
function toJsxChunks(text: string, collect: JsxCollect): JsxChunk[] {
  const out: JsxChunk[] = [];
  let idx = 0;

  for (const match of text.matchAll(Marker)) {
    if (match.index > idx) out.push(text.slice(idx, match.index));
    const { node, children } = collect[Number(match[1])];
    out.push({ node, children: toJsxChunks(children, collect) });
    idx = match.index + match[0].length;
  }
  if (idx < text.length) out.push(text.slice(idx));

  return out;
}

/**
 * Generate the component export as an ESM node with estree, for the MDX.js compiler.
 */
function jsxToEstree(as: string, chunks: JsxChunk[]): MdxjsEsm {
  const hasJsx = chunks.some((chunk) => typeof chunk !== 'string');
  let value: Expression;
  if (chunks.length === 0) value = literal('');
  else if (typeof chunks[0] === 'string' && chunks.length === 1) value = literal(chunks[0]);
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
      typeof chunk === 'string'
        ? { type: 'JSXExpressionContainer', expression: literal(chunk) }
        : elementToEstree(chunk),
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
