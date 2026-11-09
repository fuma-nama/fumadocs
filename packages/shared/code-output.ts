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
  /** the opening tag without its end */
  open: string;
  /** the name in code, see {@link keptElement} */
  ref: string;
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
 * A stringifier whose output can have parts rendered from code: replacements mark them, `toCode()` splits the output on
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
    toCode: (text: string) => chunksToCode(chunks(text), literal),
    /** whether the output has elements of the MDX components `_c` */
    usesComponents: (text: string) => usesComponents(chunks(text)),
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
      const elements = usesComponents(list);
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

/**
 * A kept JSX element of a component, its name resolves like in MDX: the names declared in the module are its variables,
 * other components are from the MDX components `_c`.
 */
export function keptElement(node: CodeNode, scope: ReadonlySet<string>): KeptElement | undefined {
  const name = node.name;
  if (typeof name !== 'string' || !componentNameRegex.test(name)) return;
  const ref = scope.has(name) ? name : `_c.${name}`;
  let open = `<${ref}`;
  for (const attr of node.attributes as JsxAttributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') open += ` {${attr.value}}`;
    else if (attr.value == null) open += ` ${attr.name}`;
    else if (typeof attr.value === 'string')
      open += ` ${attr.name}={${JSON.stringify(attr.value)}}`;
    else open += ` ${attr.name}={${attr.value.value}}`;
  }
  return { open, ref, inline: node.type === 'mdxJsxTextElement' };
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

/** a heading of structured data, `code` is its ID as code */
interface StructuredHeading {
  id: string;
  code?: string;
  content: string;
}

/** the records of structured data in document order, their content with the markers of code */
export function createStructuredRecords() {
  const records: ((StructuredHeading | StructuredContent) & { when: string[] })[] = [];
  type Output = Pick<ReturnType<typeof createCodeOutput>, 'toStatic' | 'toCode' | 'usesComponents'>;

  return {
    /** `when`: the conditions of the branches of `<show>` around it */
    push: (item: StructuredHeading | StructuredContent, when: string[] = []) =>
      records.push({ ...item, when }),
    toStatic(out: Output) {
      const data = {
        contents: [] as StructuredContent[],
        headings: [] as { id: string; content: string }[],
      };
      let heading: string | undefined;
      for (const record of records) {
        const content = out.toStatic(record.content);
        if ('id' in record) {
          heading = record.id;
          if (content) data.headings.push({ id: record.id, content });
          continue;
        }
        const item: StructuredContent = { heading: record.heading ?? heading, content };
        if (record.table) item.table = record.table;
        data.contents.push(item);
      }
      return data;
    },
    /** the code of the runtime records, a function of the props giving the records that show, see `toStructuredData()` */
    toCode(out: Output): string {
      const items: { code: string; when: string[] }[] = [];
      let components = false;
      for (const record of records) {
        components ||= out.usesComponents(record.content);
        let code = `{content: ${out.toCode(record.content)}`;
        if ('id' in record) code += `, id: ${record.code ?? JSON.stringify(record.id)}`;
        else {
          if (record.heading !== undefined) code += `, heading: ${JSON.stringify(record.heading)}`;
          if (record.table) code += `, table: ${JSON.stringify(record.table)}`;
        }
        items.push({ code: `${code}}`, when: record.when });
      }
      const list = guardedArray(items);
      // the MDX components are page props, like in the content
      return components
        ? `(props) => {\nconst _c = props.components;\nreturn ${list};\n}`
        : `(props) => ${list}`;
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
      const { open, ref, inline, children } = chunk;
      const element =
        children.length > 0 ? `${open}>${chunksToJsx(children, literal)}</${ref}>` : `${open} />`;
      // keep inline elements in inline context when rendered
      out += inline ? `<span>${element}</span>` : element;
    }
  }
  return out;
}

/** whether the chunks have elements of the MDX components `_c` */
function usesComponents(chunks: Chunk[]): boolean {
  return chunks.some(
    (chunk) =>
      typeof chunk !== 'string' &&
      'children' in chunk &&
      (('ref' in chunk && chunk.ref.startsWith('_c.')) || usesComponents(chunk.children)),
  );
}
