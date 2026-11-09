/** the element of `<show>` branches, defined in the module by {@link showDeclaration} */
export const showElement = '_Show';

/** the ESM code that defines {@link showElement} */
export const showDeclaration = `export function ${showElement}(props) { return props.when ? props.children : null }`;

/** a part of an output that renders from code */
export type CodePart =
  /** a value, like an authored expression, `fallback` in outputs that can't render it */
  | { code: string; fallback: string }
  /** content shown when `when` holds, a branch of `<show>` checked when rendering */
  | { when: string }
  | KeptElement;

/** a kept JSX element */
export interface KeptElement {
  /** the opening tag without its end, with the name prefixed */
  open: string;
  name: string;
  inline: boolean;
}

/** Markdown and the parts of it rendered from code, the content of branches and elements as chunks */
export type Chunk =
  | string
  | Extract<CodePart, { code: string }>
  | (Exclude<CodePart, { code: string }> & { children: Chunk[] });

/** the attributes of a JSX element, in mdast and Sätteri */
type JsxAttributes = (
  | { type: 'mdxJsxAttribute'; name: string; value?: string | { value: string } | null }
  | { type: 'mdxJsxExpressionAttribute'; value: string }
)[];

interface CodeNode {
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

const markerRegex = /\0(\/?)(\d+)\0/g;

/**
 * A stringifier whose output can have parts rendered from code: replacements mark them, `chunks()` splits the output on
 * their markers. Code reads the props of the page, an output with it is a function of the props.
 */
export function createCodeOutput<N extends CodeNode, S extends CodeStringifier<N>>(
  createStringifier: (expression: (code: string, fallback: string) => string) => S,
  options: {
    /** the program of an authored expression */
    program: (node: N) => { body: unknown[] } | null | undefined;
    range: (node: N) => { start: number; end: number } | undefined;
  },
) {
  const parts: CodePart[] = [];
  let dynamic = false;
  /** a value */
  const mark = (part: CodePart) => `\0${parts.push(part) - 1}\0`;
  /** content, it stays in the output so edits apply to it like to other content (e.g. the prefixes of lists) */
  const wrap = (part: CodePart, content: string) => {
    const i = parts.push(part) - 1;
    return `\0${i}\0${content}\0/${i}\0`;
  };
  const s = createStringifier((code, fallback) => {
    dynamic = true;
    return mark({ code, fallback });
  });

  return {
    s,
    wrap,
    /** whether the output has code */
    get dynamic() {
      return dynamic;
    },
    /** the output without code: expressions as their fallbacks, branches unwrapped */
    toStatic(text: string): string {
      return text.replace(markerRegex, (_, close: string, i: string) => {
        const part = parts[Number(i)];
        return !close && 'fallback' in part ? part.fallback : '';
      });
    },
    chunks(text: string): Chunk[] {
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
        } else if ('code' in part) {
          stack.at(-1)!.push(part);
        } else {
          stack.push([]);
        }
      }
      pushText(text.length);
      return root;
    },
    /**
     * Mark a node rendered from code: an authored expression, or a branch of `<show>` checked when rendering.
     *
     * @returns whether it is one
     */
    markCode(node: N): boolean {
      if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') {
        const text = literalText(options.program(node));
        if (text !== undefined) {
          s.replace(node, text);
          return true;
        }
        dynamic = true;
        const range = options.range(node);
        const fallback = range ? s.source.slice(range.start, range.end) : '';
        s.replace(node, mark({ code: node.value as string, fallback }));
        return true;
      }

      const when = showCondition(node);
      if (!when) return false;
      dynamic = true;
      s.replace(node, (s) => wrap({ when }, s.inner(node)));
      return true;
    },
  };
}

/** the text an expression renders when it is a comment or a literal, booleans and `null` render nothing */
function literalText(program: { body: unknown[] } | null | undefined): string | undefined {
  const statement = program?.body[0] as
    | { type: string; expression?: { type: string; value?: unknown } }
    | undefined;
  if (!statement) return '';
  if (statement.expression?.type !== 'Literal') return;
  const { value } = statement.expression;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean' || value === null) return '';
}

/** the condition of a branch of `<show>` checked when rendering */
export function showCondition(node: CodeNode): string | undefined {
  if (node.name !== showElement) return;
  for (const attr of node.attributes as JsxAttributes)
    if (attr.type === 'mdxJsxAttribute' && attr.name === 'when' && typeof attr.value === 'object')
      return attr.value?.value;
}

/** a kept JSX element, its name resolves from `_c` */
export function keptElement(node: CodeNode, name: string): KeptElement {
  let open = `<_c.${name}`;
  for (const attr of node.attributes as JsxAttributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') open += ` {${attr.value}}`;
    else if (attr.value == null) open += ` ${attr.name}`;
    else if (typeof attr.value === 'string')
      open += ` ${attr.name}={${JSON.stringify(attr.value)}}`;
    else open += ` ${attr.name}={${attr.value.value}}`;
  }
  return { open, name, inline: node.type === 'mdxJsxTextElement' };
}

/** all of the conditions */
export function and(conditions: string[]): string | undefined {
  if (conditions.length > 0) return `(${conditions.join(') && (')})`;
}

/** an array of items, each kept only when its conditions hold */
export function guardedArray(items: { code: string; when: string[] }[]): string {
  let out = '[';
  for (const { code, when } of items) {
    const test = and(when);
    out += test ? `...(${test} ? [${code}] : []),` : `${code},`;
  }
  return `${out}]`;
}

/** the chunks as one value: a string without parts, a fragment otherwise */
export function chunksToCode(chunks: Chunk[]): string {
  let text = '';
  for (const chunk of chunks) {
    if (typeof chunk !== 'string') return `<>${chunksToJsx(chunks)}</>`;
    text += chunk;
  }
  return JSON.stringify(text);
}

function chunksToJsx(chunks: Chunk[]): string {
  let out = '';
  for (const chunk of chunks) {
    if (typeof chunk === 'string') out += `{${JSON.stringify(chunk)}}`;
    else if ('code' in chunk) out += `{${chunk.code}}`;
    else if ('when' in chunk)
      out += `{(${chunk.when}) ? <>${chunksToJsx(chunk.children)}</> : null}`;
    else {
      const { open, name, inline, children } = chunk;
      const element =
        children.length > 0 ? `${open}>${chunksToJsx(children)}</_c.${name}>` : `${open} />`;
      // keep inline elements in inline context when rendered
      out += inline ? `<span>${element}</span>` : element;
    }
  }
  return out;
}

/**
 * The export of Markdown: a string without elements or branches, a component rendered with `renderToMarkdown()` of
 * `fumadocs-core/server` otherwise.
 */
export function markdownCode(as: string, chunks: Chunk[], component: boolean): string {
  if (!component) {
    let out = '';
    for (const chunk of chunks) {
      if (out) out += ' + ';
      out +=
        typeof chunk === 'string' ? JSON.stringify(chunk) : `(${(chunk as { code: string }).code})`;
    }
    return `export const ${as} = ${out || '""'};`;
  }

  const elements = hasElement(chunks);
  return [
    `import { asMarkdown as _asMarkdown${elements ? ', jsxComponents as _jsxComponents' : ''} } from "fumadocs-core/server";`,
    `export function ${as}(props) {`,
    '  if (!_asMarkdown()) return null;',
    ...(elements ? ['  const _c = _jsxComponents(props.components);'] : []),
    `  return ${chunksToCode(chunks)};`,
    '}',
  ].join('\n');
}

function hasElement(chunks: Chunk[]): boolean {
  return chunks.some(
    (chunk) =>
      typeof chunk !== 'string' &&
      ('open' in chunk || ('children' in chunk && hasElement(chunk.children))),
  );
}
