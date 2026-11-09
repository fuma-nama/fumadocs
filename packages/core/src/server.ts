import { AsyncLocalStorage } from 'node:async_hooks';
import { isValidElement, type ElementType, type ReactElement, type ReactNode } from 'react';
import { markdownTable } from '@/mdx-plugins/stringifier';

/**
 * Render React trees (RSC) into Markdown.
 *
 * Calling `asMarkdown()` is the opt-in: components that never call it during their render are kept as JSX syntax
 * (`<Card title="...">children</Card>`) rather than converted HTML, and so are client components, which never execute
 * on the server. Host elements returned by an opted-in component are converted with a basic HTML to Markdown table.
 *
 * ```tsx
 * function Callout({ title, children }) {
 *   if (asMarkdown()) return md.linePrefix("> ")`**${title}**\n${children}`;
 *
 *   return <div>...</div>;
 * }
 * ```
 */

type Props = Record<string, unknown> & { children?: ReactNode };
type Component = (props: unknown) => ReactNode | Promise<ReactNode>;

interface State {
  /** inside `<pre>`: emit raw text only */
  pre: boolean;
  /** inside inline content (paragraph, heading, table cell) */
  inline: boolean;
  heading: boolean;
  /** set by `ul`/`ol` for each item, consumed by `li` */
  list?: { ordered: boolean; index: number };
  /** render synchronously: what renders asynchronously is kept as JSX syntax, see `renderToMarkdownSync()` */
  sync?: boolean;
}

/** Markdown, or its promise when a part of the tree renders asynchronously */
type Text = string | Promise<string>;

const ROOT_STATE: State = { pre: false, inline: false, heading: false };

const CLIENT_REFERENCE = Symbol.for('react.client.reference');
const REACT_LAZY = Symbol.for('react.lazy');
const REACT_MEMO = Symbol.for('react.memo');
const REACT_FORWARD_REF = Symbol.for('react.forward_ref');

/** one frame per component render, so the walker knows which component opted in */
interface Frame {
  optedIn: boolean;
}

const NOT_OPTED_IN = Symbol();
/** the result of a component, see `optIn()` */
type OptIn = ReactNode | typeof NOT_OPTED_IN;
const store = new AsyncLocalStorage<Frame>({
  name: 'fumadocs:markdown',
});

/**
 * Whether the current component is being rendered into Markdown, calling it opts the component in.
 */
export function asMarkdown(): boolean {
  const frame = store.getStore();
  if (!frame) return false;

  frame.optedIn = true;
  return true;
}

/**
 * Render a React tree into a Markdown document.
 */
export async function renderToMarkdown(node: ReactNode): Promise<string> {
  return collapse(await walk(node, ROOT_STATE)).trim();
}

/**
 * Render a React tree into a Markdown document synchronously. Components that render asynchronously, like async
 * components and Markdown forms made with `md`, are kept as JSX syntax.
 */
export function renderToMarkdownSync(node: ReactNode): string {
  // synchronous rendering never waits, so the walker returns a string
  return collapse(walk(node, { ...ROOT_STATE, sync: true }) as string).trim();
}

/**
 * Render a page element into Markdown, `undefined` when its component doesn't call `asMarkdown()`.
 */
export async function renderRoute(element: ReactElement): Promise<string | undefined> {
  if (typeof element.type !== 'function') return;

  const result = await optIn(element.type as Component, element.props);
  if (result !== NOT_OPTED_IN) return renderToMarkdown(result);
}

/**
 * Resolve the MDX components of a generated Markdown component (`remarkLLMs` with the runtime analysis):
 * a missing component becomes a stub that `renderToMarkdown` serializes as JSX syntax.
 */
export function jsxComponents(
  components: Record<string, ElementType> | undefined,
): Record<string, ElementType> {
  return new Proxy(components ?? {}, {
    get(target, key) {
      const value = target[key as string];
      if (value !== undefined || typeof key !== 'string') return value;

      const stub = () => null;
      stub.displayName = key;
      return stub;
    },
  });
}

export type MarkdownTag = (
  strings: TemplateStringsArray,
  ...values: ReactNode[]
) => Promise<string>;

/**
 * Tagged template for Markdown, interpolated values can be strings, React nodes, promises, or arrays of them.
 *
 * Use `md\`${children}\`` inside a component to stringify its children before manipulating them, the result is not
 * trimmed so block-level output keeps its trailing blank line.
 *
 * Formatters (Prettier, oxfmt) format `md` templates as Markdown and may move the content onto its own indented lines,
 * so a leading empty line, the indentation before the closing backtick and the common indentation are removed.
 */
export const md: MarkdownTag & {
  /**
   * Like `md`, but trims the result, prefixes every line (empty lines receive the trimmed prefix, e.g. `>` instead of
   * `> `) and returns it as a block.
   */
  linePrefix: (prefix: string) => MarkdownTag;
  /**
   * Like `md`, but trims the result, indents every non-empty line and returns it as a block.
   */
  indent: (size?: number) => MarkdownTag;
} = Object.assign(
  async function md(strings: TemplateStringsArray, ...values: ReactNode[]): Promise<string> {
    const parts = dedent(strings);
    const resolved = await Promise.all(values.map(render));
    let out = parts[0]!;

    for (let i = 0; i < resolved.length; i++) {
      out += resolved[i]! + parts[i + 1]!;
    }

    return out;
  },
  {
    linePrefix(prefix: string): MarkdownTag {
      return async (strings, ...values) => {
        const text = (await md(strings, ...values)).trim();
        return text.length === 0 ? '' : `\n${prefixLines(text, prefix)}\n\n`;
      };
    },
    indent(size = 2): MarkdownTag {
      return md.linePrefix(' '.repeat(size));
    },
  },
);

/** stands in for interpolations while dedenting, so their lines count as content */
const PLACEHOLDER = '\0';

function dedent(strings: readonly string[]): string[] {
  const lines = strings.join(PLACEHOLDER).split('\n');
  if (lines.length === 1) return [...strings];

  if (lines[0]!.trim().length === 0) lines.shift();
  // the indentation before the closing backtick, an empty last line is the author's own trailing newline
  const last = lines[lines.length - 1]!;
  if (lines.length > 1 && last.length > 0 && last.trim().length === 0) lines.pop();

  let indent = Infinity;
  for (const line of lines) {
    if (line.trim().length > 0) indent = Math.min(indent, /^[ \t]*/.exec(line)![0].length);
  }

  let out = '';
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) out += '\n';
    out += indent === Infinity ? lines[i] : lines[i]!.slice(Math.min(indent, lines[i]!.length));
  }

  return out.split(PLACEHOLDER);
}

function render(node: ReactNode): Text {
  return then(walk(node, ROOT_STATE), collapse);
}

/**
 * Prefix every line, empty lines receive the trimmed prefix (e.g. `>` instead of `> `).
 */
function prefixLines(text: string, prefix: string): string {
  const empty = prefix.trimEnd();
  return text.replace(/^.*$/gm, (line) => (line.length === 0 ? empty : prefix + line));
}

function collapse(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Render a component in its own frame, `NOT_OPTED_IN` when it never calls `asMarkdown()`.
 *
 * A component that throws before opting in (e.g. it needs a context that only exists on its own route) is treated the
 * same, it has no Markdown form.
 */
function optIn(component: Component, props: unknown): OptIn | Promise<OptIn> {
  const frame: Frame = { optedIn: false };
  const settle = (result: ReactNode): OptIn => (frame.optedIn ? result : NOT_OPTED_IN);
  const fail = (e: unknown): OptIn => {
    if (frame.optedIn) throw e;
    return NOT_OPTED_IN;
  };

  try {
    const result = store.run(frame, () => component(props));
    return isThenable(result) ? Promise.resolve(result).then(settle, fail) : settle(result);
  } catch (e) {
    return fail(e);
  }
}

function walk(node: ReactNode, state: State): Text {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (isThenable(node)) {
    return state.sync ? drop(node, '') : Promise.resolve(node).then((node) => walk(node, state));
  }
  if (isValidElement(node)) return element(node.type, node.props as Props, state);
  if (typeof node === 'object' && Symbol.iterator in node) {
    return then(all(Array.from(node, (child) => walk(child, state))), (parts) => parts.join(''));
  }

  return '';
}

function element(type: unknown, props: Props, state: State): Text {
  if (typeof type === 'string') return host(type, props, state);
  // client references can be callable proxies (Vite RSC) that throw when called, check them first
  if (isClientReference(type)) return jsx(clientReferenceName(type.$$id), props, state);
  if (typeof type === 'function') return component(type as Component, props, state);
  // Fragment, Suspense, StrictMode, Profiler, Activity
  if (typeof type === 'symbol') return walk(props.children, state);

  if (typeof type === 'object' && type !== null) {
    const special = type as {
      $$typeof?: symbol;
      type?: unknown;
      render?: Component;
      _payload?: unknown;
      _init?: (payload: unknown) => unknown;
    };

    switch (special.$$typeof) {
      case REACT_LAZY: {
        const resolved = resolveLazy(special);
        if (!(resolved instanceof Promise)) return element(resolved, props, state);
        // not loaded yet, its name is unknown
        if (state.sync) return drop(resolved, jsx('Component', props, state));
        return resolved.then((type) => element(type, props, state));
      }
      case REACT_MEMO:
        return element(special.type, props, state);
      case REACT_FORWARD_REF:
        return component(special.render!, props, state);
    }
  }

  return '';
}

function component(fn: Component, props: Props, state: State): Text {
  const result = optIn(fn, props);
  const render = (result: OptIn) =>
    result === NOT_OPTED_IN ? jsx(componentName(fn), props, state) : walk(result, state);

  if (!(result instanceof Promise)) return render(result);
  return state.sync ? drop(result, jsx(componentName(fn), props, state)) : result.then(render);
}

function componentName(fn: Component): string {
  const { displayName, name } = fn as { displayName?: unknown; name?: string };
  return typeof displayName === 'string' && displayName ? displayName : name || 'Component';
}

/** the type of a lazy component, a promise while it loads */
function resolveLazy(type: { _payload?: unknown; _init?: (payload: unknown) => unknown }): unknown {
  try {
    return type._init!(type._payload);
  } catch (e) {
    // pending: React throws the thenable
    if (!isThenable(e)) throw e;
    return Promise.resolve(e).then(() => resolveLazy(type));
  }
}

/** continue with a value, or with what its promise resolves to */
function then<T>(value: T | Promise<T>, fn: (value: T) => Text): Text {
  return value instanceof Promise ? value.then(fn) : fn(value);
}

/** the texts, or their promise when one of them is a promise */
function all(texts: Text[]): string[] | Promise<string[]> {
  for (const text of texts) if (text instanceof Promise) return Promise.all(texts);
  return texts as string[];
}

/** synchronous rendering doesn't wait for a promise: `fallback` stands in for it, its rejection is ignored */
function drop(promise: PromiseLike<unknown>, fallback: Text): Text {
  Promise.resolve(promise).catch(() => {});
  return fallback;
}

/**
 * The export name of a client reference, or a PascalCase name from its file for default exports.
 */
function clientReferenceName(id: unknown): string {
  if (typeof id !== 'string') return 'Component';

  try {
    id = decodeURIComponent(id);
  } catch {
    // bundlers may URL-encode the module id, keep as-is otherwise
  }

  const hash = (id as string).lastIndexOf('#');
  const exportName = hash === -1 ? '' : (id as string).slice(hash + 1);
  if (exportName && exportName !== 'default') return exportName;

  const file = (hash === -1 ? (id as string) : (id as string).slice(0, hash)).split(/[\\/]/).pop()!;
  let name = '';
  for (const part of file.replace(/\.[^.]+$/, '').split(/[^\w$]+/)) {
    if (part) name += part[0]!.toUpperCase() + part.slice(1);
  }

  return name || 'Component';
}

const MAX_ATTRIBUTE_LENGTH = 1024;
const PRESENTATIONAL_PROPS = new Set(['children', 'className', 'style', 'tabIndex']);

/**
 * Serialize a component as JSX syntax, for components without a Markdown form.
 */
function jsx(name: string, props: Props, state: State): Text {
  let open = `<${name}`;
  for (const key in props) {
    if (PRESENTATIONAL_PROPS.has(key)) continue;
    const attr = attribute(key, props[key]);
    if (attr !== undefined) open += ` ${attr}`;
  }

  return then(walk(props.children, state), (children) => {
    if (state.inline) {
      return children.trim().length === 0 ? `${open} />` : `${open}>${children}</${name}>`;
    }

    const body = children.trim();
    if (body.length === 0) return `\n${open} />\n\n`;
    return `\n${open}>\n${body}\n</${name}>\n\n`;
  });
}

function attribute(key: string, value: unknown): string | undefined {
  if (value === true) return key;
  if (value === false || value === null || value === undefined) return;
  if (typeof value === 'string') {
    return value.length > MAX_ATTRIBUTE_LENGTH ? undefined : `${key}=${JSON.stringify(value)}`;
  }
  if (typeof value === 'number' || typeof value === 'bigint') return `${key}={${value}}`;
  if (typeof value === 'function' || typeof value === 'symbol' || isValidElement(value)) return;

  try {
    const json = JSON.stringify(value, (_, v: unknown) => (isValidElement(v) ? undefined : v));
    // large data props (e.g. a whole OpenAPI document) are noise in JSX syntax
    if (json === undefined || json.length > MAX_ATTRIBUTE_LENGTH) return;
    return `${key}={${json}}`;
  } catch {
    return;
  }
}

// the rows and cells of a table, until it formats them
const ROW = '\u001e';
const CELL = '\u001f';

const INLINE_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'cite',
  'code',
  'del',
  'em',
  'i',
  'kbd',
  'label',
  'mark',
  'q',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
]);

const DROP_TAGS = new Set([
  'head',
  'link',
  'meta',
  'noscript',
  'script',
  'style',
  'svg',
  'template',
  'title',
]);

function host(tag: string, props: Props, state: State): Text {
  if (DROP_TAGS.has(tag)) return '';

  if (state.pre) {
    if (tag === 'br') return '\n';
    return walk(props.children, state);
  }

  const children = (override: Partial<State>, fn: (children: string) => Text) =>
    then(walk(props.children, { ...state, ...override }), fn);

  switch (tag) {
    case 'p':
      return children({ inline: true }, (c) => {
        c = c.trim();
        return state.inline ? `${c} ` : `\n${c}\n\n`;
      });
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return children({ inline: true, heading: true }, (c) => {
        c = c.trim().replace(/\s*\n\s*/g, ' ');
        return `\n${'#'.repeat(Number(tag[1]))} ${c}\n\n`;
      });
    case 'a': {
      const href = typeof props.href === 'string' ? props.href : undefined;
      return children({ inline: true }, (c) => {
        // anchor links in headings (e.g. fumadocs headings)
        if (!href || (state.heading && href.startsWith('#'))) return c;
        const text = c.trim();
        return text.length === 0 ? `<${href}>` : `[${text}](${href})`;
      });
    }
    case 'strong':
    case 'b':
      return children({ inline: true }, (c) => wrap(c, '**'));
    case 'em':
    case 'i':
      return children({ inline: true }, (c) => wrap(c, '*'));
    case 'del':
    case 's':
      return children({ inline: true }, (c) => wrap(c, '~~'));
    case 'code':
    case 'kbd':
      return children({ inline: true }, (c) =>
        // multi-line code without a `<pre>` ancestor (e.g. `pre` mapped to a client component)
        c.includes('\n') && !state.inline ? codeFence(detectLang(props), c) : inlineCode(c),
      );
    case 'pre':
      return children({ pre: true }, (c) => codeFence(detectLang(props), c));
    case 'blockquote':
      return children({ inline: false }, (c) => `\n${prefixLines(collapse(c).trim(), '> ')}\n\n`);
    case 'ul':
    case 'ol': {
      const ordered = tag === 'ol';
      let index = typeof props.start === 'number' ? props.start : 1;
      const items = flatten(props.children).map((child) => {
        if (!isValidElement(child)) return typeof child === 'string' ? child.trim() : '';
        return walk(child, { ...state, inline: false, list: { ordered, index: index++ } });
      });

      return then(all(items), (items) => `\n${items.join('')}\n`);
    }
    case 'li': {
      const marker = state.list?.ordered ? `${state.list.index}. ` : '- ';
      return children({ inline: false }, (c) => {
        // keep nested lists tight
        const body = c.trim().replace(/\n{2,}(?=(?:[-*+] |\d+\. ))/g, '\n');
        return `${marker}${prefixLines(body, ' '.repeat(marker.length)).slice(marker.length)}\n`;
      });
    }
    case 'img': {
      if (typeof props.src !== 'string') return '';
      const alt = typeof props.alt === 'string' ? props.alt : '';
      return state.inline ? `![${alt}](${props.src})` : `\n![${alt}](${props.src})\n\n`;
    }
    case 'hr':
      return '\n---\n\n';
    case 'br':
      return '\n';
    case 'table':
      return children({ inline: false }, (text) => {
        const rows: string[][] = [];
        // without the text before the first row & cell
        for (const row of text.split(ROW).slice(1)) rows.push(row.split(CELL).slice(1));
        return rows.length === 0 ? '' : `\n${markdownTable(rows)}\n\n`;
      });
    case 'tr':
      return children({ inline: false }, (c) => `${ROW}${c}`);
    case 'th':
    case 'td':
      return children({ inline: true }, (c) => `${CELL}${c}`);
  }

  if (INLINE_TAGS.has(tag)) return children({ inline: true }, (c) => c);
  return children({ inline: false }, (c) => {
    c = c.trim();
    return c.length === 0 ? '' : `\n${c}\n\n`;
  });
}

function wrap(text: string, marker: string): string {
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
  return core ? `${lead}${marker}${core}${marker}${trail}` : text;
}

function codeFence(lang: string, code: string): string {
  const text = code.replace(/\n$/, '');
  const fence = '`'.repeat(Math.max(3, longestRun(text, '`') + 1));
  return `\n${fence}${lang}\n${text}\n${fence}\n\n`;
}

function inlineCode(text: string): string {
  const fence = '`'.repeat(longestRun(text, '`') + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

function longestRun(text: string, char: string): number {
  let max = 0;
  let current = 0;

  for (const c of text) {
    current = c === char ? current + 1 : 0;
    if (current > max) max = current;
  }

  return max;
}

/** from `data-lang` or a `language-*` class name, of the element or its `<code>` child */
function detectLang(props: Props): string {
  const lang = props['data-lang'] ?? props.lang;
  if (typeof lang === 'string' && lang.length > 0) return lang;

  const fromClass = (className: unknown) =>
    typeof className === 'string'
      ? /(?:^|\s)(?:language|lang)-([\w+#.-]+)/.exec(className)?.[1]
      : undefined;
  let out = fromClass(props.className);

  for (const child of flatten(props.children)) {
    if (out) break;
    if (isValidElement(child) && child.type === 'code')
      out = fromClass((child.props as Props).className);
  }

  return out ?? '';
}

/**
 * Direct children, flattened through arrays and fragments.
 */
function flatten(node: ReactNode, out: ReactNode[] = []): ReactNode[] {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (isValidElement(node)) {
    if (typeof node.type === 'symbol') flatten((node.props as Props).children, out);
    else out.push(node);
  } else if (typeof node === 'object' && Symbol.iterator in node) {
    for (const child of node) flatten(child, out);
  } else {
    out.push(node);
  }

  return out;
}

function isClientReference(type: unknown): type is { $$id?: unknown } {
  return (
    (typeof type === 'function' || (typeof type === 'object' && type !== null)) &&
    (type as { $$typeof?: unknown }).$$typeof === CLIENT_REFERENCE
  );
}

function isThenable(value: unknown): value is PromiseLike<ReactNode> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}
