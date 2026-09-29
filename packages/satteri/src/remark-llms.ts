import type { MdastPluginEntry } from 'satteri';
import { defineMdastPlugin } from 'satteri';
import {
  createStringifier,
  offsets,
  type SourceEdit,
  type Stringifier,
  type PositionedNode,
} from './stringifier';
import type { ExtraPluginHooks } from './compile';

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
   * Form of the export:
   *
   * - `string`: the output Markdown.
   * - `function`: a component: Markdown content is kept as authored source, while JSX elements
   *   stay as JSX, receiving their original props and resolving from `props.components`.
   *   Render it with `renderToMarkdown` from `fumadocs-core/server`, where a component
   *   can call `asMarkdown()` to define its own Markdown form.
   *
   * @default string
   */
  output?: 'function' | 'string';
}

interface JsxSpan {
  start: number;
  end: number;
  name: string;
  inline: boolean;
  children: JsxSpan[];
}

const customIdRegex = /\s*\[#[^]+?]\s*$/;
const componentNameRegex = /^[A-Z][\w$]*$/;

/**
 * Export the document as Markdown, sliced from the authored source: heading IDs are added,
 * frontmatter & ESM nodes are dropped, and includes are replaced with their content.
 */
export function remarkLlms({
  as = '_markdown',
  headingIds = true,
  output = 'string',
}: LLMsOptions = {}) {
  const jsx = output === 'function';
  const factory = () => {
    const spans: JsxSpan[] = [];
    let s: Stringifier;

    const drop = (node: PositionedNode) => s.remove(node);
    const collectJsx = (node: PositionedNode & { type: string; name?: string | null }) => {
      if (!jsx || !node.name || !componentNameRegex.test(node.name)) return;
      const pos = offsets(node);
      if (!pos) return;

      spans.push({
        ...pos,
        name: node.name,
        inline: node.type === 'mdxJsxTextElement',
        children: [],
      });
    };

    return defineMdastPlugin({
      name: 'remark-llms',
      options: { position: true },
      before(_root, ctx) {
        s = createStringifier(ctx);
      },
      mdxjsEsm: drop,
      yaml: drop,
      toml: drop,
      heading(node) {
        const pos = offsets(node);
        if (!pos) return;

        const slice = s.source.slice(pos.start, pos.end);
        const marker = customIdRegex.exec(slice);
        if (!headingIds) {
          if (marker) s.edit(pos.start + marker.index, pos.end, '');
          return;
        }

        const id = (node.data as { hProperties?: { id?: unknown } } | undefined)?.hProperties?.id;
        if (typeof id === 'string' && !marker) s.edit(pos.end, pos.end, ` [#${id}]`);
      },
      mdxJsxFlowElement: collectJsx,
      mdxJsxTextElement: collectJsx,
      after(root, ctx) {
        const end = root.position?.end.offset ?? s.source.length;

        if (!jsx) {
          ctx.data.markdown ??= `${s.slice(0, end).trim()}\n`;
          return;
        }
        if (!as) return;

        const roots = buildTree(spans, s.edits);
        ctx.prependChild(root, {
          type: 'mdxjsEsm',
          value: toComponentCode(as, childrenToCode(s, 0, end, roots), roots.length > 0),
        });
      },
    });
  };

  return Object.assign(factory, {
    collectExports({ data, addExport }) {
      if (as && !jsx) addExport(as, JSON.stringify(data.markdown ?? ''));
    },
  } satisfies ExtraPluginHooks) as MdastPluginEntry & ExtraPluginHooks;
}

/**
 * Nest the pre-order span list by containment, dropping spans that overlap an edit
 * (e.g. a JSX element inside an include-replaced paragraph).
 */
function buildTree(spans: JsxSpan[], edits: readonly SourceEdit[]): JsxSpan[] {
  const roots: JsxSpan[] = [];
  const stack: JsxSpan[] = [];
  let e = 0;

  for (const span of spans) {
    while (e < edits.length && edits[e].end <= span.start) e++;
    if (e < edits.length && edits[e].start < span.end && edits[e].end > span.start) continue;

    while (stack.length > 0 && stack[stack.length - 1].end <= span.start) stack.pop();
    const parent = stack[stack.length - 1];
    (parent ? parent.children : roots).push(span);
    stack.push(span);
  }

  return roots;
}

function toComponentCode(as: string, body: string, hasJsx: boolean): string {
  return [
    `import { asMarkdown as _asMarkdown${hasJsx ? ', jsxComponents as _jsxComponents' : ''} } from "fumadocs-core/server";`,
    `export function ${as}(props) {`,
    '  if (!_asMarkdown()) return null;',
    ...(hasJsx ? ['  const _c = _jsxComponents(props.components);'] : []),
    `  return ${body};`,
    '}',
  ].join('\n');
}

/**
 * Generate the JSX for the document: Markdown becomes string literals, kept
 * elements stay as JSX with `_c.`-prefixed names and their attributes verbatim.
 */
function childrenToCode(s: Stringifier, start: number, end: number, spans: JsxSpan[]): string {
  if (spans.length === 0) {
    const text = s.slice(start, end).trim();
    return text ? JSON.stringify(`${text}\n`) : '""';
  }

  return `<>${innerToCode(s, start, end, spans)}</>`;
}

function elementToCode(s: Stringifier, span: JsxSpan): string {
  const tagEnd = scanTagEnd(s.source, span.start, span.end);
  // name & attributes verbatim, so the compiler re-parses them the same way
  const open = `<_c.${s.source.slice(span.start + 1, tagEnd + 1)}`;

  let out: string;
  if (s.source[tagEnd - 1] === '/') {
    out = open;
  } else {
    const closeStart = s.source.lastIndexOf('</', span.end);
    out = `${open}${innerToCode(s, tagEnd + 1, closeStart, span.children)}</_c.${span.name}>`;
  }

  // keep inline elements in inline context when rendered
  return span.inline ? `<span>${out}</span>` : out;
}

function innerToCode(s: Stringifier, start: number, end: number, children: JsxSpan[]): string {
  const indent = commonIndent(s.source.slice(start, end));
  const parts: string[] = [];
  let cursor = start;

  const pushText = (text: string) => {
    if (text.trim()) parts.push(`{${JSON.stringify(dedent(text, indent))}}`);
  };

  for (const child of children) {
    pushText(s.slice(cursor, child.start));
    parts.push(elementToCode(s, child));
    cursor = child.end;
  }
  pushText(s.slice(cursor, end));

  return parts.join('');
}

/** the authored indentation of an element's children, stripped from their chunks */
function commonIndent(text: string): number {
  let min = Infinity;
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue;
    let i = 0;
    while (line[i] === ' ') i++;
    min = Math.min(min, i);
  }

  return min === Infinity ? 0 : min;
}

function dedent(text: string, indent: number): string {
  if (indent === 0) return text;

  const lines = text.split('\n');
  let out = '';
  for (let j = 0; j < lines.length; j++) {
    if (j > 0) out += '\n';
    let i = 0;
    while (i < indent && lines[j][i] === ' ') i++;
    out += lines[j].slice(i);
  }

  return out;
}

/**
 * Index of the `>` ending the opening tag. Quotes at brace depth 0 are JSX attribute
 * strings (no escapes); quotes inside `{}` follow JavaScript escaping.
 */
function scanTagEnd(source: string, start: number, end: number): number {
  let quote = '';
  let depth = 0;

  for (let i = start + 1; i < end; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\' && depth > 0) i++;
      else if (c === quote) quote = '';
      continue;
    }

    switch (c) {
      case '"':
      case "'":
        quote = c;
        break;
      case '`':
        if (depth > 0) quote = c;
        break;
      case '{':
        depth++;
        break;
      case '}':
        depth--;
        break;
      case '>':
        if (depth === 0) return i;
        break;
    }
  }

  return end - 1;
}
