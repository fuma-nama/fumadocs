import type { Nodes, RootContent } from 'mdast';
import { valueToEstree } from 'estree-util-value-to-estree';
import type {
  ArrayExpression,
  ObjectExpression,
  Expression,
  JSXAttribute,
  JSXElement,
  JSXFragment,
  JSXSpreadAttribute,
  Program,
} from 'estree-jsx';
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
  MdxjsEsm,
} from 'mdast-util-mdx';
import type Hast from 'hast';
import type { VFile } from 'vfile';
import { createStringifier } from './stringifier';
import { showElement } from './remark-show';

export function isJsxElement(node: Nodes): node is MdxJsxFlowElement | MdxJsxTextElement {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

/**
 * Visit a tree in document order, returning `skip` skips the children of a node. Unlike `unist-util-visit`, it doesn't
 * look up the index of each node in its parent, which is quadratic on wide trees.
 */
export function walk<N extends { type: string; children?: N[] }>(
  node: N,
  visitor: (
    node: N,
    index: number | undefined,
    parent: { children: N[] } | undefined,
  ) => 'skip' | void,
  index?: number,
  parent?: { children: N[] },
): void {
  if (visitor(node, index, parent) === 'skip' || !node.children) return;
  for (let i = 0; i < node.children.length; i++)
    walk(node.children[i], visitor, i, node as { children: N[] });
}

/** the text of a node, authored expressions are code and render from it */
export function flattenNode(node: RootContent): string {
  if ('children' in node) return node.children.map(flattenNode).join('');
  if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') return '';

  if ('value' in node && typeof node.value === 'string') return node.value;

  return '';
}
export function flattenNodeHast(node: Hast.RootContent): string {
  if ('children' in node) {
    return node.children.map(flattenNodeHast).join('');
  }

  return 'value' in node && typeof node.value === 'string' ? node.value : '';
}

export function toMdxExport(name: string, value: unknown): MdxjsEsm {
  return toMdxExportRaw(name, valueToEstree(value));
}

export function toMdxExportRaw(name: string, expression: Expression): MdxjsEsm {
  return {
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
              type: 'VariableDeclaration',
              kind: 'let',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: {
                    type: 'Identifier',
                    name,
                  },
                  init: expression,
                },
              ],
            },
          },
        ],
      },
    },
  };
}

export function handleTag(value: string, tag: string): string | false {
  const idx = value.indexOf(tag);
  if (idx !== -1) {
    return value.slice(0, idx).trimEnd() + value.slice(idx + tag.length);
  }

  return false;
}

/** a part of an output that renders from code */
export type CodePart =
  /** a value, like an authored expression, `fallback` in outputs that can't render it */
  | { expression: Expression; fallback: string }
  /** content shown when `when` holds, a branch of `<show>` checked when rendering */
  | { when: Expression }
  /** a kept JSX element */
  | { element: MdxJsxFlowElement | MdxJsxTextElement };

/** Markdown and the parts of it rendered from code, the content of branches and elements as chunks */
export type Chunk =
  | string
  | Extract<CodePart, { expression: Expression }>
  | (Exclude<CodePart, { expression: Expression }> & { children: Chunk[] });

/**
 * A stringifier whose output can have parts rendered from code: replacements mark them, `chunks()` splits the output on
 * their markers. Authored expressions and the branches of `<show>` checked when rendering read render scope (`props`),
 * an output with them is a function of the props.
 */
export function createCodeOutput(file: VFile, namespace?: string) {
  const parts: CodePart[] = [];
  let dynamic = false;
  /** a value */
  const mark = (part: CodePart) => `\0${parts.push(part) - 1}\0`;
  /** content, it stays in the output so edits apply to it like to other content (e.g. the prefixes of lists) */
  const wrap = (part: CodePart, content: string) => {
    const i = parts.push(part) - 1;
    return `\0${i}\0${content}\0/${i}\0`;
  };
  const s = createStringifier(file, namespace, (expression, fallback) =>
    mark({ expression, fallback }),
  );

  /** the output without code: expressions as their fallbacks, branches unwrapped */
  function toStatic(text: string): string {
    return text.replace(markerRegex, (_, close: string, i: string) => {
      const part = parts[Number(i)];
      return !close && 'fallback' in part ? part.fallback : '';
    });
  }

  function chunks(text: string): Chunk[] {
    const root: Chunk[] = [];
    const stack: Chunk[][] = [root];
    /** a branch just closed, the whitespace after it goes with it */
    let branch: Chunk[] | undefined;
    let idx = 0;
    const pushText = (end: number) => {
      let value = text.slice(idx, end);
      if (branch) {
        const lead = /^\s*/.exec(value)![0];
        if (lead.includes('\n')) {
          branch.push(lead);
          value = value.slice(lead.length);
        }
        branch = undefined;
      }
      if (value) stack.at(-1)!.push(value);
    };

    for (const match of text.matchAll(markerRegex)) {
      pushText(match.index);
      idx = match.index + match[0].length;
      const part = parts[Number(match[2])];
      if (match[1]) {
        const children = stack.pop()!;
        stack.at(-1)!.push({ ...part, children } as Chunk);
        if ('when' in part) branch = children;
      } else if ('expression' in part) {
        stack.at(-1)!.push(part);
      } else {
        stack.push([]);
      }
    }
    pushText(text.length);
    return root;
  }

  return {
    s,
    mark,
    wrap,
    chunks,
    toStatic,
    /** whether a marked part reads render scope */
    get dynamic() {
      return dynamic;
    },
    /**
     * Mark a node rendered from code: an authored expression, or a branch of `<show>` checked when rendering.
     *
     * @returns whether it is one
     */
    markCode(node: Nodes): boolean {
      if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') {
        const expression = programExpression(node.data?.estree);
        // a literal, like `{' '}`, is text
        const text = expression ? literalText(expression) : '';
        if (text !== undefined || !expression) {
          s.replace(node, text ?? '');
          return true;
        }
        dynamic = true;
        const range = s.range(node);
        const fallback = range ? s.source.slice(range.start, range.end) : '';
        s.replace(node, mark({ expression, fallback }));
        return true;
      }

      const when = isJsxElement(node) ? showCondition(node) : undefined;
      if (!when) return false;
      dynamic = true;
      s.replace(node, (s) => wrap({ when }, s.inner(node)));
      return true;
    },
  };
}

const markerRegex = /\0(\/?)(\d+)\0/g;

/** the text a literal renders, booleans and `null` render nothing */
function literalText(expression: { type: string; value?: unknown }): string | undefined {
  if (expression.type !== 'Literal') return;
  const { value } = expression;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean' || value === null) return '';
}

export function programExpression(program: Program | null | undefined): Expression | undefined {
  const statement = program?.body[0];
  if (statement?.type === 'ExpressionStatement') return statement.expression;
}

/** the condition of a branch of `<show>` checked when rendering */
export function showCondition(node: {
  name?: string | null;
  attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[];
}): Expression | undefined {
  if (node.name !== showElement) return;
  for (const attr of node.attributes)
    if (attr.type === 'mdxJsxAttribute' && attr.name === 'when' && typeof attr.value === 'object')
      return programExpression(attr.value?.data?.estree);
}

/** all of the conditions */
export function and(conditions: Expression[]): Expression | undefined {
  let out: Expression | undefined;
  for (const item of conditions)
    out = out ? { type: 'LogicalExpression', operator: '&&', left: out, right: item } : item;
  return out;
}

/** `cond ? then : otherwise` */
function ternary(test: Expression, then: Expression, otherwise: Expression): Expression {
  return { type: 'ConditionalExpression', test, consequent: then, alternate: otherwise };
}

/** an array of items, each kept only when its conditions hold */
export function guardedArray(items: { value: Expression; when: Expression[] }[]): ArrayExpression {
  const elements: ArrayExpression['elements'] = [];
  for (const { value, when } of items) {
    const test = and(when);
    elements.push(
      test
        ? {
            type: 'SpreadElement',
            argument: ternary(
              test,
              { type: 'ArrayExpression', elements: [value] },
              { type: 'ArrayExpression', elements: [] },
            ),
          }
        : value,
    );
  }
  return { type: 'ArrayExpression', elements };
}

/** the chunks as one value: a string without parts, a fragment otherwise */
export function chunksToExpression(chunks: Chunk[]): Expression {
  if (chunks.every((chunk) => typeof chunk === 'string'))
    return { type: 'Literal', value: chunks.join('') };
  return fragment(chunks);
}

function fragment(chunks: Chunk[]): JSXFragment {
  return {
    type: 'JSXFragment',
    openingFragment: { type: 'JSXOpeningFragment' },
    closingFragment: { type: 'JSXClosingFragment' },
    children: chunksToJsx(chunks),
  };
}

function chunksToJsx(chunks: Chunk[]): JSXFragment['children'] {
  const out: JSXFragment['children'] = [];
  for (const chunk of chunks) {
    if (typeof chunk === 'string') {
      out.push({ type: 'JSXExpressionContainer', expression: { type: 'Literal', value: chunk } });
    } else if ('element' in chunk) {
      out.push(elementToJsx(chunk.element, chunk.children));
    } else if ('when' in chunk) {
      const content = fragment(chunk.children);
      out.push({
        type: 'JSXExpressionContainer',
        expression: ternary(chunk.when, content, { type: 'Literal', value: null }),
      });
    } else {
      out.push({ type: 'JSXExpressionContainer', expression: chunk.expression });
    }
  }
  return out;
}

/** a kept element, its name resolves from `_c` */
function elementToJsx(node: MdxJsxFlowElement | MdxJsxTextElement, children: Chunk[]): JSXElement {
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

    const colon = attr.name.indexOf(':');
    attributes.push({
      type: 'JSXAttribute',
      name:
        colon !== -1
          ? {
              type: 'JSXNamespacedName',
              namespace: { type: 'JSXIdentifier', name: attr.name.slice(0, colon) },
              name: { type: 'JSXIdentifier', name: attr.name.slice(colon + 1) },
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
    children: chunksToJsx(children),
  };
  if (node.type === 'mdxJsxFlowElement') return element;

  // keep inline elements in inline context when rendered
  const span = { type: 'JSXIdentifier', name: 'span' } as const;
  return {
    type: 'JSXElement',
    openingElement: { type: 'JSXOpeningElement', name: span, attributes: [], selfClosing: false },
    closingElement: { type: 'JSXClosingElement', name: span },
    children: [element],
  };
}

/** `key: value` in an object */
export function property(key: string, value: Expression): ObjectExpression['properties'][number] {
  return {
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    key: { type: 'Identifier', name: key },
    value,
    kind: 'init',
  };
}

/** `(props) => expression` */
export function propsFunction(body: Expression): Expression {
  return {
    type: 'ArrowFunctionExpression',
    params: [{ type: 'Identifier', name: 'props' }],
    body,
    async: false,
    expression: true,
    generator: false,
  };
}

/** `import { names } from source` as an ESM node, `[imported, local]` per name */
export function toMdxImport(source: string, names: [string, string][]): MdxjsEsm {
  return {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ImportDeclaration',
            attributes: [],
            specifiers: names.map(([imported, local]) => ({
              type: 'ImportSpecifier',
              imported: { type: 'Identifier', name: imported },
              local: { type: 'Identifier', name: local },
            })),
            source: { type: 'Literal', value: source },
          },
        ],
      },
    },
  };
}
