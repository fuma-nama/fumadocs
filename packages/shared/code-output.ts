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
 * A stringifier whose output can have parts rendered from code: replacements mark them, `toText()` splits the output on
 * their markers. Runtime outputs are functions of the props of the page, code reads them in render scope.
 *
 * @param isStatic - for static outputs: authored expressions keep their source, the content of every branch shows
 * @param literal - the code of a string
 */
export function createCodeOutput<N extends CodeNode, S extends CodeStringifier<N>>(
  createStringifier: (expression: (code: string, fallback: string) => string) => S,
  range: (node: N) => { start: number; end: number } | undefined,
  isStatic = false,
  literal: (text: string) => string = JSON.stringify,
) {
  const parts: CodePart[] = [];
  /** a value */
  const mark = (part: CodePart) => `\0${parts.push(part) - 1}\0`;
  /** content, it stays in the output so edits apply to it like to other content (e.g. the prefixes of lists) */
  const wrap = (part: CodePart, content: string) => {
    const i = parts.push(part) - 1;
    return `\0${i}\0${content}\0/${i}\0`;
  };
  const expression = (code: string, fallback: string) => mark({ code, fallback });
  const s = createStringifier(expression);
  const chunks = (text: string): Chunk[] => {
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
  };

  return {
    s,
    wrap,
    /** mark the code of a value, `fallback` in static outputs */
    expression,
    /** the output without code: expressions as their fallbacks, branches unwrapped */
    toStatic(text: string): string {
      return text.replace(markerRegex, (_, close: string, i: string) => {
        const part = parts[Number(i)];
        return !close && 'fallback' in part ? part.fallback : '';
      });
    },
    /** the output as one value: a string without parts, a fragment otherwise */
    /** the output as the code of a string, for text like search records */
    toText: (text: string) => chunksToText(chunks(text), literal),
    /**
     * The export of Markdown, a component rendered with `renderToMarkdown()` of `fumadocs-core/server`, or the string
     * of static Markdown, code of plugins is concatenated
     */
    markdownCode(as: string, text: string): string {
      const list = chunks(text);
      if (isStatic) {
        let out = '';
        for (const chunk of list)
          out += `${out ? ' + ' : ''}${typeof chunk === 'string' ? literal(chunk) : `(${(chunk as { code: string }).code})`}`;
        return `export const ${as} = ${out || '""'};`;
      }
      const elements = hasElement(list);
      return [
        `import { asMarkdown as _asMarkdown${elements ? ', jsxComponents as _jsxComponents' : ''} } from "fumadocs-core/server";`,
        `export function ${as}(props) {`,
        '  if (!_asMarkdown()) return null;',
        ...(elements ? ['  const _c = _jsxComponents(props.components);'] : []),
        `  return ${chunksToCode(list, literal)};`,
        '}',
      ].join('\n');
    },
    /**
     * Mark a node rendered from code: an authored expression, or a branch of `<show>` checked when rendering.
     *
     * @returns whether it is one
     */
    markCode(node: N): boolean {
      if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') {
        if (isStatic) return true;
        const position = range(node);
        const fallback = position ? s.source.slice(position.start, position.end) : '';
        s.replace(node, mark({ code: node.value as string, fallback }));
        return true;
      }

      const when = showCondition(node);
      if (!when) return false;
      s.replace(node, (s) => (isStatic ? s.inner(node) : wrap({ when }, s.inner(node))));
      return true;
    },
  };
}

/** the conditions of the branches of `<show>` around a node, outermost first */
export function showConditions(
  node: object,
  ctx: { parent: (node: never) => object | undefined },
): string[] {
  const out: string[] = [];
  for (let p = ctx.parent(node as never); p; p = ctx.parent(p as never)) {
    const condition = showCondition(p as CodeNode);
    if (condition) out.unshift(condition);
  }
  return out;
}

/** content analysed from source, for static outputs: authored expressions as their source, the content of branches */
export function staticContent<N extends CodeNode & { children?: N[] }>(nodes: N[]): N[] {
  const out: N[] = [];
  for (const node of nodes) {
    if (node.type === 'mdxTextExpression')
      out.push({ type: 'text', value: `{${node.value}}` } as N);
    else if (showCondition(node)) out.push(...staticContent(node.children!));
    else if (node.children) out.push({ ...node, children: staticContent(node.children) });
    else out.push(node);
  }
  return out;
}

/** the condition of a branch of `<show>` checked when rendering */
export function showCondition(node: CodeNode): string | undefined {
  if (node.name !== showElement) return;
  for (const attr of node.attributes as JsxAttributes)
    if (attr.type === 'mdxJsxAttribute' && attr.name === 'when' && typeof attr.value === 'object')
      return attr.value?.value;
}

const componentNameRegex = /^[A-Z][\w$]*$/;

/** a kept JSX element of a component, its name resolves from `_c` */
export function keptElement(node: CodeNode): KeptElement | undefined {
  const name = node.name;
  if (typeof name !== 'string' || !componentNameRegex.test(name)) return;
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

/** an element on one line has inline content, recorded like a paragraph */
export function isInline(source: string, range: { start: number; end: number }): boolean {
  const line = source.indexOf('\n', range.start);
  return line === -1 || line >= range.end;
}

/**
 * A JSX element as an HTML tag, so search dialogs render it as an element. Expression values become strings, values
 * and content are kept on one line, values are truncated.
 */
export function toHtmlTag(node: CodeNode, inner: string): string {
  let attrs = '';
  for (const attr of node.attributes as JsxAttributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') continue;
    if (attr.value == null) {
      attrs += ` ${attr.name}`;
      continue;
    }

    let value = (typeof attr.value === 'string' ? attr.value : attr.value.value).replace(
      /\s+/g,
      ' ',
    );
    if (value.length > 100) value = `${value.slice(0, 100)}…`;
    attrs += ` ${attr.name}="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`;
  }

  const children = inner.replace(/\s+/g, ' ');
  const name = node.name as string;
  if (!children) return `<${name}${attrs} />`;
  return `<${name}${attrs}>${children}</${name}>`;
}

/** all of the conditions */
export function and(conditions: string[]): string | undefined {
  if (conditions.length > 0) return `(${conditions.join(') && (')})`;
}

/** a content of structured data, see `fumadocs-core/mdx-plugins/remark-structure` */
interface StructuredContent {
  heading: string | undefined;
  content: string;
  table?: string;
}

/** the records of structured data in document order, their content with the markers of code */
export function createStructuredRecords() {
  /** `code` is the ID as code */
  const headings: { id: string; code?: string; content: string; when: string[] }[] = [];
  const contents: (StructuredContent & { when: string[]; after: number })[] = [];
  type Output = Pick<ReturnType<typeof createCodeOutput>, 'toStatic' | 'toText'>;
  const idOf = (i: number) => headings[i].code ?? JSON.stringify(headings[i].id);

  /**
   * The heading of content: the last heading before it that shows with it, the conditions of the branches decide
   * those in other branches.
   */
  function headingOf(when: string[], after: number): string {
    let chain = '';
    for (let i = after - 1; i >= 0; i--) {
      const test = and(headings[i].when.filter((item) => !when.includes(item)));
      if (!test) return `${chain}(${idOf(i)})`;
      chain += `${test} ? (${idOf(i)}) : `;
    }
    return `${chain}undefined`;
  }

  return {
    headings,
    pushContent: (item: StructuredContent, when: string[]) =>
      contents.push({ ...item, when, after: headings.length }),
    toStatic(out: Output) {
      const data = {
        contents: [] as StructuredContent[],
        headings: [] as { id: string; content: string }[],
      };
      for (const { id, content } of headings)
        if (content) data.headings.push({ id, content: out.toStatic(content) });
      for (const { when: _, after, heading = headings[after - 1]?.id, ...item } of contents)
        data.contents.push({ heading, ...item, content: out.toStatic(item.content) });
      return data;
    },
    /** the code of the runtime structured data, a function of the props */
    toCode(out: Output): string {
      const headingList: { code: string; when: string[] }[] = [];
      for (let i = 0; i < headings.length; i++) {
        const { content, when } = headings[i];
        if (content)
          headingList.push({
            code: `{id: ${idOf(i)}, content: ${out.toText(content)}}`,
            when,
          });
      }
      const contentList: { code: string; when: string[] }[] = [];
      for (const { when, after, heading, table, content } of contents) {
        let code = `{heading: ${heading === undefined ? headingOf(when, after) : JSON.stringify(heading)}`;
        code += `, content: ${out.toText(content)}`;
        if (table) code += `, table: ${JSON.stringify(table)}`;
        contentList.push({ code: `${code}}`, when });
      }
      return `(props) => ({headings: ${guardedArray(headingList)}, contents: ${guardedArray(contentList)}})`;
    },
  };
}

/** the code of an output list: a function of the props in runtime analysis */
export function listCode(items: { code: string; when: string[] }[], isStatic: boolean): string {
  const list = guardedArray(items);
  return isStatic ? list : `(props) => ${list}`;
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

/** the chunks as the code of a string, like React, values other than strings and numbers render nothing */
function chunksToText(chunks: Chunk[], literal: (text: string) => string): string {
  if (chunks.every((chunk) => typeof chunk === 'string')) return literal(chunks.join(''));
  const parts: string[] = [];
  for (const chunk of chunks) {
    if (typeof chunk === 'string') parts.push(literal(chunk));
    else if ('code' in chunk)
      parts.push(`((v) => typeof v === "string" || typeof v === "number" ? v : "")(${chunk.code})`);
    else if ('when' in chunk)
      parts.push(`((${chunk.when}) ? ${chunksToText(chunk.children, literal)} : "")`);
    else parts.push(chunksToText(chunk.children, literal));
  }
  return `[${parts.join(', ')}].join("")`;
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
    else if ('code' in chunk) out += `{${chunk.code}}`;
    else if ('when' in chunk)
      out += `{(${chunk.when}) ? <>${chunksToJsx(chunk.children, literal)}</> : null}`;
    else {
      const { open, name, inline, children } = chunk;
      const element =
        children.length > 0
          ? `${open}>${chunksToJsx(children, literal)}</_c.${name}>`
          : `${open} />`;
      // keep inline elements in inline context when rendered
      out += inline ? `<span>${element}</span>` : element;
    }
  }
  return out;
}

function hasElement(chunks: Chunk[]): boolean {
  return chunks.some(
    (chunk) =>
      typeof chunk !== 'string' &&
      ('open' in chunk || ('children' in chunk && hasElement(chunk.children))),
  );
}
