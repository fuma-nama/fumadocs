import type { Expression, MemberExpression } from 'estree-jsx';
import type { Parent, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Processor, Transformer } from 'unified';
import type { Params } from '@/source';
import { replaceSource } from './stringifier';

declare module 'vfile' {
  interface DataMap {
    /** [Fumadocs: remark-show] for a page of a dynamic file, its params, read as `props` */
    params?: Params;
  }
}

export interface RemarkShowOptions {
  /**
   * Values resolved at build time, by the names code reads them with, like the `define` option of Vite:
   * `{ 'import.meta.env.EDITION': 'pro' }`. They are added to the defaults.
   *
   * A function decides them per page from its params, the defaults it doesn't return aren't resolved.
   *
   * @defaultValue the params of the page as `props`, and the env vars that bundlers inline into pages, with a
   * `NEXT_PUBLIC_`, `VITE_` or `PUBLIC_` prefix, as `process.env` and `import.meta.env`
   */
  define?:
    | Record<string, unknown>
    | ((page: { params?: Params; defaults: Record<string, unknown> }) => Record<string, unknown>);
}

/** the element of the branches checked when rendering, defined by the `declaration` of {@link ShowContext} */
export const showElement = '_Show';

export interface ShowContext {
  /** the value of an expression, when the build-time values decide it */
  evaluate: (expression: Expression) => { value: unknown } | undefined;
  /** whether code may read build-time values, to skip parsing the code that doesn't */
  reads: (code: string) => boolean;
  /** the ESM code that defines `showElement` */
  declaration: string;
}

/**
 * The build-time values of pages, for ports of `remarkShow()` to other compilers. Call it with the params of each
 * page.
 */
export function createShowContext({ define = {} }: RemarkShowOptions = {}): (
  params?: Params,
) => ShowContext {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env))
    if (v !== undefined && /^(NEXT_PUBLIC|VITE|PUBLIC)_/.test(k)) env[k] = v;

  return (params) => {
    const defaults: Record<string, unknown> = { 'process.env': env, 'import.meta.env': env };
    if (params) defaults.props = params;
    const values =
      typeof define === 'function' ? define({ params, defaults }) : { ...defaults, ...define };
    const names = Object.keys(values);
    return {
      reads: (code) => names.some((name) => code.includes(name)),
      evaluate(expression) {
        const value = evaluate(expression, values);
        if (value !== unknown) return { value };
      },
      declaration: `export function ${showElement}(props) { return props.when ? props.children : null }`,
    };
  };
}

/**
 * Decide `<show when={...}>` branches before other plugins see the tree: a branch decided by `define` or the params of
 * the page (`file.data.params`, as `props`) is removed or unwrapped, the others are checked when rendering. Text
 * interpolations they decide, like `{props.framework}`, become text. Other expressions read `props` when rendering.
 */
export function remarkShow(this: Processor, options?: RemarkShowOptions): Transformer<Root, Root> {
  const createContext = createShowContext(options);

  return (tree, file) => {
    const context = createContext(file.data.params);
    let used = false;

    const visit = (parent: Parent) => {
      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i];
        if (node.type === 'mdxTextExpression') {
          const statement = node.data?.estree?.body[0];
          const result =
            statement?.type === 'ExpressionStatement'
              ? context.evaluate(statement.expression)
              : undefined;
          const value = result?.value;
          if (typeof value === 'string' || typeof value === 'number') {
            replaceSource(file, node, String(value));
            parent.children[i] = { type: 'text', value: String(value) };
          } else if (result && (value === null || typeof value !== 'object')) {
            // booleans, `null` and `undefined` render nothing
            replaceSource(file, node, '');
            parent.children.splice(i--, 1);
          }
          continue;
        }

        if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
          if (node.name === 'show') {
            const condition =
              getCondition(node) ??
              file.fail('`<show>` needs a `when` expression, like `when={x === "y"}`', node);
            const result = context.evaluate(condition);
            if (result && !result.value) {
              replaceSource(file, node, '');
              parent.children.splice(i--, 1);
              continue;
            }

            if (result) {
              // a fragment, so the content keeps its structure
              replaceSource(file, node, (s) => s.inner(node));
              node.name = null;
              node.attributes = [];
            } else {
              used = true;
              node.name = showElement;
            }
          }
        }
        if ('children' in node) visit(node);
      }
    };

    visit(tree);
    if (!used) return;
    // parsed for the estree of an ESM node, its positions aren't in the document
    const [declaration] = (this.parse(context.declaration) as Root).children;
    delete declaration.position;
    tree.children.unshift(declaration);
  };
}

function getCondition(node: MdxJsxFlowElement | MdxJsxTextElement): Expression | undefined {
  for (const attr of node.attributes) {
    if (attr.type !== 'mdxJsxAttribute' || attr.name !== 'when') continue;
    if (typeof attr.value !== 'object' || !attr.value) return;
    const statement = attr.value.data?.estree?.body[0];
    if (statement?.type === 'ExpressionStatement') return statement.expression;
  }
}

const unknown = Symbol();

function evaluate(node: Expression, define: Record<string, unknown>): unknown {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
    case 'MetaProperty':
    case 'MemberExpression':
      return resolve(node, define);
    case 'UnaryExpression': {
      const value = node.operator === '!' ? evaluate(node.argument, define) : unknown;
      return value === unknown ? unknown : !value;
    }
    case 'BinaryExpression': {
      if (node.left.type === 'PrivateIdentifier') return unknown;
      const a = evaluate(node.left, define);
      const b = evaluate(node.right, define);
      if (a === unknown || b === unknown) return unknown;
      switch (node.operator) {
        case '===':
          return a === b;
        case '!==':
          return a !== b;
      }
      return unknown;
    }
    case 'LogicalExpression': {
      const left = evaluate(node.left, define);
      if (left === unknown) return unknown;
      const takeLeft =
        node.operator === '&&' ? !left : node.operator === '||' ? !!left : left != null;
      return takeLeft ? left : evaluate(node.right, define);
    }
    case 'ConditionalExpression': {
      const test = evaluate(node.test, define);
      if (test === unknown) return unknown;
      return evaluate(test ? node.consequent : node.alternate, define);
    }
    default:
      return unknown;
  }
}

/** the value of a reference by its name in `define`, like `import.meta.env.EDITION`, or a member of one */
function resolve(node: Expression, define: Record<string, unknown>): unknown {
  if (node.type === 'Identifier' && node.name === 'undefined') return undefined;
  const name = nameOf(node);
  if (name !== undefined && Object.hasOwn(define, name)) return define[name];
  if (node.type !== 'MemberExpression' || node.object.type === 'Super') return unknown;

  const object = resolve(node.object, define);
  const key = keyOf(node);
  if (
    typeof object !== 'object' ||
    object === null ||
    key === undefined ||
    !Object.hasOwn(object, key)
  )
    return unknown;
  return (object as Record<PropertyKey, unknown>)[key];
}

function nameOf(node: Expression): string | undefined {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MetaProperty') return `${node.meta.name}.${node.property.name}`;
  if (node.type !== 'MemberExpression' || node.object.type === 'Super') return;
  const object = nameOf(node.object);
  const key = keyOf(node);
  if (object !== undefined && typeof key === 'string') return `${object}.${key}`;
}

function keyOf(node: MemberExpression): PropertyKey | undefined {
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  if (node.property.type === 'Literal' && typeof node.property.value !== 'object')
    return node.property.value as PropertyKey;
}
