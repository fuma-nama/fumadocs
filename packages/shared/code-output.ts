import type { MarkdownTarget } from 'fumadocs-core/server';
import { showCondition, type JsxAttributes } from './show';

/** a value from code, like an authored expression: `fallback` is its text in outputs that can't run it */
interface Value {
  code: string;
  fallback: string;
  inline?: boolean;
}

/** content that shows when `when` holds, a branch of `<show>` */
interface Branch {
  when: string;
}

/** a JSX element of a component, kept in the output */
interface KeptElement {
  /** the opening tag without its end */
  open: string;
  name: string;
  inline: boolean;
}

/** a part of an output that renders from code */
type CodePart = Value | Branch | KeptElement;

/** Markdown and its parts from code, branches and elements hold their content */
type Chunk = string | Value | ((Branch | KeptElement) & { children: Chunk[] });

export interface CodeNode {
  type: string;
  name?: unknown;
  attributes?: unknown;
  value?: unknown;
}

interface CodeStringifier<N> {
  source: string;
  replace(node: N, text: string | ((s: this) => string)): void;
  inner(node: N): string;
}

export interface CodeOutputOptions<N, S> {
  /**
   * What the output is for, like in `renderToMarkdown()` of `fumadocs-core/server`. Search has the text of links and
   * no images, and the content of the JSX elements it doesn't keep.
   */
  target: MarkdownTarget;
  /** whether the output is static: it has no parts from code, the elements kept for search are HTML tags */
  isStatic: boolean;
  /**
   * Whether to keep a JSX element. By default the elements of components, or for static search, `File`, `TypeTable`,
   * `Callout` and `Card`.
   */
  keep?: (node: N) => boolean;
  /** create the stringifier of the output, `expression` marks the code of its replacements */
  stringifier: (expression: (code: string, fallback: string) => string) => S;
  range: (node: N) => { start: number; end: number } | undefined;
  /** parse code with JSX */
  parse: (code: string) => object;
  /** the code of a string, JSON by default */
  literal?: (text: string) => string;
}

const markerRegex = /\0(\/?)(\d+)\0/g;
const componentNameRegex = /^[A-Z][\w$]*$/;
/** the elements that static search keeps as HTML tags by default */
export const staticTagRegex = /^(File|TypeTable|Callout|Card)$/;

/**
 * Markdown stringified from the authored source for a target, with parts that render from code. Replacements mark the
 * parts, so edits apply to their content like to other content (e.g. the prefixes of list items), and the code of the
 * output splits it on the markers. The code runs in a function of the props of the page, in the scope of its module.
 */
export function createCodeOutput<N extends CodeNode, S extends CodeStringifier<N>>({
  target,
  isStatic,
  keep,
  stringifier,
  range,
  parse,
  literal = JSON.stringify,
}: CodeOutputOptions<N, S>) {
  const parts: CodePart[] = [];
  /** the components that the code refers to in JSX: kept elements, and the JSX in authored code */
  const components = new Set<string>();
  const readJsx = (code: string) => {
    if (code.includes('<')) jsxComponents(parse(code), components);
  };
  const mark = (part: Value) => `\0${parts.push(part) - 1}\0`;
  const wrap = (part: Branch | KeptElement, content: string) => {
    const i = parts.push(part) - 1;
    return `\0${i}\0${content}\0/${i}\0`;
  };
  const expression = (code: string, fallback: string) => mark({ code, fallback });
  const s = stringifier(expression);

  function chunks(text: string): Chunk[] {
    const root: Chunk[] = [];
    const stack = [root];
    /** a branch that just closed, the line break after it goes with it */
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
        stack.at(-1)!.push({ ...(part as Branch | KeptElement), children });
        if ('when' in part) branch = children;
      } else if ('code' in part) stack.at(-1)!.push(part);
      else stack.push([]);
    }
    pushText(text.length);
    return root;
  }

  /** see {@link componentsCode}, of the components of the code */
  const declare = (scope: () => ReadonlySet<string>, from: string) =>
    componentsCode(components, scope, from);

  /** the JSX element of a component, with the code of its attributes */
  function component(node: N): KeptElement | undefined {
    const { name } = node;
    if (typeof name !== 'string' || !componentNameRegex.test(name)) return;
    components.add(name);
    let open = `<${name}`;
    for (const attr of node.attributes as JsxAttributes) {
      if (attr.type === 'mdxJsxExpressionAttribute') {
        open += ` {${attr.value}}`;
        readJsx(`({${attr.value}})`);
      } else if (attr.value == null) open += ` ${attr.name}`;
      else if (typeof attr.value === 'string')
        open += ` ${attr.name}={${JSON.stringify(attr.value)}}`;
      else {
        open += ` ${attr.name}={${attr.value.value}}`;
        readJsx(`(${attr.value.value}\n)`);
      }
    }
    return { open, name, inline: node.type === 'mdxJsxTextElement' };
  }

  function element(node: N) {
    const when = showCondition(node);
    if (when) return s.replace(node, (s) => wrap({ when }, s.inner(node)));

    const kept = keep ? keep(node) : !isStatic || staticTagRegex.test(String(node.name));
    const part = kept && !isStatic ? component(node) : undefined;
    if (part)
      s.replace(node, (s) => {
        const inner = s.inner(node);
        // in Markdown, block content is on its own lines
        return wrap(part, target === 'markdown' && inner && !part.inline ? `\n${inner}\n` : inner);
      });
    // Markdown has the source of other elements, search their content, as an HTML tag when kept
    else if (target === 'search')
      s.replace(node, (s) => {
        if (!kept || !(keep || isStatic)) return s.inner(node);
        const attributes: Record<string, unknown> = {};
        for (const attr of node.attributes as JsxAttributes)
          if (attr.type === 'mdxJsxAttribute')
            attributes[attr.name] =
              attr.value == null
                ? true
                : typeof attr.value === 'string'
                  ? attr.value
                  : attr.value.value;
        return toHtmlTag(node.name as string, attributes, s.inner(node));
      });
  }

  return {
    s,
    range,
    /** mark the code of a value */
    expression,
    /** Edit a node for the target: authored expressions, `<show>` branches, JSX elements, links, images and ESM. */
    edit(node: N): void {
      const { type } = node;
      if (type === 'mdxjsEsm') s.replace(node, '');
      else if (type === 'mdxJsxFlowElement' || type === 'mdxJsxTextElement') element(node);
      else if (type === 'mdxTextExpression' || type === 'mdxFlowExpression') {
        if (isStatic) return;
        const code = node.value as string;
        const position = range(node);
        s.replace(
          node,
          mark({
            code,
            fallback: position ? s.source.slice(position.start, position.end) : '',
            inline: type === 'mdxTextExpression',
          }),
        );
        readJsx(`(${code}\n)`);
      } else if (target === 'search') {
        if (type === 'link' || type === 'linkReference') s.replace(node, (s) => s.inner(node));
        else if (type === 'image' || type === 'imageReference') s.replace(node, '');
      }
    },
    /** the output without code: values as their fallbacks, the content of every branch and element */
    toStatic(text: string): string {
      return text.replace(markerRegex, (_, close: string, i: string) => {
        const part = parts[Number(i)];
        return !close && 'fallback' in part ? part.fallback : '';
      });
    },
    /** the output as a string in code, its values are concatenated: for an output without branches or elements */
    toConcat(text: string): string {
      let out = '';
      for (const chunk of chunks(text))
        out += `${out ? ' + ' : ''}${typeof chunk === 'string' ? literal(chunk) : `(${(chunk as Value).code})`}`;
      return out || '""';
    },
    /** the output as a value in code: a string without parts, a fragment otherwise */
    toCode(text: string): string {
      return chunksToCode(chunks(text), literal);
    },
    componentsCode: declare,
    /**
     * The export of processed Markdown: a component, rendered with `renderToMarkdown()` of `fumadocs-core/server`.
     * Its elements resolve like in the content, a missing MDX component is kept as JSX syntax.
     *
     * @param component - always a component, otherwise without parts from code, the text like `renderToMarkdown()` renders
     * the component
     */
    markdownCode(
      as: string,
      text: string,
      scope: () => ReadonlySet<string>,
      component: boolean,
    ): string {
      if (!component && !text.includes('\0'))
        return `export const ${as} = ${literal(text.replace(/\n{3,}/g, '\n\n').trim())};`;
      const declaration = declare(scope, '_jsxComponents(props.components)');
      return [
        `import { asMarkdown as _asMarkdown${declaration && ', jsxComponents as _jsxComponents'} } from "fumadocs-core/server";`,
        `export function ${as}(props) {`,
        '  if (!_asMarkdown()) return null;',
        declaration,
        `  return ${chunksToCode(chunks(text), literal)};`,
        '}',
      ].join('\n');
    },
  };
}

/**
 * An element as an HTML tag, so search dialogs render it as an element: its attributes that are text or `true`, with
 * values and content on one line, values truncated.
 */
export function toHtmlTag(
  name: string,
  attributes: Record<string, unknown>,
  inner: string,
): string {
  let open = `<${name}`;
  for (const key in attributes) {
    const value = attributes[key];
    if (value === true) open += ` ${key}`;
    if (key === 'children' || (typeof value !== 'string' && typeof value !== 'number')) continue;
    let text = String(value).replace(/\s+/g, ' ');
    if (text.length > 100) text = `${text.slice(0, 100)}…`;
    open += ` ${key}="${text.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`;
  }
  const children = inner.replace(/\s+/g, ' ');
  return children ? `${open}>${children}</${name}>` : `${open} />`;
}

/**
 * The declaration of the components that code refers to and the module doesn't declare. Like in the content, they
 * are MDX components.
 *
 * @param scope - the names that the module declares, read when there are components
 * @param from - the code of the MDX components
 * @param fallback - the code of a component that `from` doesn't have
 */
export function componentsCode(
  components: ReadonlySet<string>,
  scope: () => ReadonlySet<string>,
  from: string,
  fallback?: string,
): string {
  let names = '';
  if (components.size > 0) {
    const declared = scope();
    for (const name of components)
      if (!declared.has(name)) names += fallback ? `${name} = ${fallback}, ` : `${name}, `;
  }
  return names && `const { ${names}} = ${from};`;
}

/** the components that a program refers to in JSX, like MDX: the first name of a tag that isn't an HTML element */
export function jsxComponents(node: unknown, out: Set<string>): void {
  if (typeof node !== 'object' || node === null) return;
  let { type, name } = node as {
    type?: string;
    name?: { type: string; name: string; object?: never };
  };
  if (type === 'JSXOpeningElement') {
    while (name?.object) name = name.object;
    if (name?.type === 'JSXIdentifier' && !/^[a-z]/.test(name.name)) out.add(name.name);
  }
  for (const key in node) jsxComponents((node as Record<string, unknown>)[key], out);
}

interface EsmNode {
  type: string;
  specifiers?: readonly { local: { name?: string } }[];
  declaration?: EsmNode | null;
  declarations?: readonly { id: { type: string; name?: string } }[];
  id?: { name?: string } | null;
}

/** the names declared by the ESM statements of a module: imports and top-level declarations */
export function moduleScope(statements: Iterable<object>, scope = new Set<string>()): Set<string> {
  for (const item of statements as Iterable<EsmNode>) {
    for (const { local } of item.specifiers ?? []) if (local.name) scope.add(local.name);
    const declaration = item.type === 'ExportNamedDeclaration' ? item.declaration : item;
    if (declaration?.id?.name) scope.add(declaration.id.name);
    for (const { id } of declaration?.declarations ?? [])
      if (id.type === 'Identifier' && id.name) scope.add(id.name);
  }
  return scope;
}

/** all of the conditions */
export function and(conditions: string[]): string | undefined {
  if (conditions.length > 0) return `(${conditions.join(') && (')})`;
}

/**
 * The code of a list output: a function of the props giving the items whose conditions hold, or the list when static.
 *
 * @param declaration - the code that declares the names of the items, see {@link componentsCode}
 */
export function listCode(
  items: { code: string; when: string[] }[],
  isStatic: boolean,
  declaration = '',
): string {
  let list = '[';
  for (const { code, when } of items) {
    const test = and(when);
    list += test ? `...(${test} ? [${code}] : []),` : `${code},`;
  }
  list += ']';
  if (isStatic) return list;
  return declaration ? `(props) => {\n${declaration}\nreturn ${list};\n}` : `(props) => ${list}`;
}

function chunksToCode(chunks: Chunk[], literal: (text: string) => string): string {
  let text = '';
  for (const chunk of chunks) {
    if (typeof chunk !== 'string') return `<>${chunksToJsx(chunks, literal)}</>`;
    text += chunk;
  }
  return literal(text);
}

function chunksToJsx(chunks: Chunk[], literal: (text: string) => string): string {
  let out = '';
  for (const chunk of chunks) {
    if (typeof chunk === 'string') out += `{${literal(chunk)}}`;
    // keep inline values in inline context when rendered
    else if ('code' in chunk)
      out += chunk.inline ? `<span>{${chunk.code}}</span>` : `{${chunk.code}}`;
    else if ('when' in chunk)
      out += `{(${chunk.when}) ? <>${chunksToJsx(chunk.children, literal)}</> : null}`;
    else {
      const { open, name, inline, children } = chunk;
      const element =
        children.length > 0 ? `${open}>${chunksToJsx(children, literal)}</${name}>` : `${open} />`;
      out += inline ? `<span>${element}</span>` : element;
    }
  }
  return out;
}
