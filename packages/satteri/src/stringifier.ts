import type { MdastVisitorContext } from 'satteri';

/** a replacement of a source range, ordered by `start` and non-overlapping */
export interface SourceEdit {
  start: number;
  end: number;
  text: string;
}

declare module 'satteri' {
  interface DataMap {
    /**
     * source-range replacements recorded by plugins that replace authored content
     * (e.g. `remark-include`), applied by every stringifier of the document.
     */
    _sourceEdits?: SourceEdit[];
  }
}

export interface PositionedNode {
  position?: { start: { offset?: number }; end: { offset?: number } };
}

export function offsets(node: PositionedNode): { start: number; end: number } | undefined {
  const pos = node.position;
  if (pos?.start.offset !== undefined && pos.end.offset !== undefined) {
    return { start: pos.start.offset, end: pos.end.offset };
  }
}

/**
 * Record the Markdown form of generated content over an authored node's source range,
 * for plugins that replace nodes (e.g. includes, generated type tables). Source-based
 * Markdown output cannot see the replacement, it shows this text instead.
 *
 * `markdown` is only called when source positions are tracked, i.e. when a consumer
 * of the recorded edits is present.
 */
export function replaceSource(
  ctx: MdastVisitorContext,
  node: PositionedNode,
  markdown: () => string,
): void {
  const pos = offsets(node);
  if (pos)
    (ctx.data._sourceEdits ??= []).push({ start: pos.start, end: pos.end, text: markdown() });
}

/**
 * Markdown output backed by the authored source. Requires `options: { position: true }`
 * on the plugin, and inherits the `_sourceEdits` recorded by earlier plugins.
 *
 * Plugin-inserted nodes carry no position: they are invisible to `slice`, and
 * `stringify` falls back to their plain text content.
 */
export interface Stringifier {
  readonly source: string;
  /** edits so far, sorted by `start` */
  readonly edits: readonly SourceEdit[];

  /** replace a source range in output */
  edit(start: number, end: number, text: string): void;
  /** drop a node from output, along with the blank line it leaves behind */
  remove(node: PositionedNode): void;
  /** replace a node with its plain text content in output */
  flatten(node: PositionedNode): void;
  /** a region of the document, with the edits inside it applied */
  slice(start: number, end: number): string;
  /**
   * A single node as Markdown: its source slice. A node without a position
   * becomes its plain text content, or a synthesized tag for JSX elements.
   */
  stringify(node: PositionedNode): string;
}

export function createStringifier(ctx: MdastVisitorContext): Stringifier {
  const source = ctx.source;
  const own: SourceEdit[] = [];
  let sorted: SourceEdit[] | undefined;

  function edits(): SourceEdit[] {
    if (!sorted) {
      sorted = ctx.data._sourceEdits ? [...ctx.data._sourceEdits, ...own] : [...own];
      sorted.sort((a, b) => a.start - b.start);
    }

    return sorted;
  }

  return {
    source,
    get edits() {
      return edits();
    },
    edit(start, end, text) {
      own.push({ start, end, text });
      sorted = undefined;
    },
    remove(node) {
      const pos = offsets(node);
      if (pos) this.edit(pos.start, pos.end, '');
    },
    flatten(node) {
      const pos = offsets(node);
      if (pos) this.edit(pos.start, pos.end, ctx.textContent(node as never));
    },
    slice(start, end) {
      return splice(source, start, end, edits());
    },
    stringify(node) {
      const pos = offsets(node);
      if (pos) return splice(source, pos.start, pos.end, edits());

      const { type } = node as { type?: string };
      if (type === 'mdxJsxFlowElement' || type === 'mdxJsxTextElement') {
        return syntheticElement(node as JsxElementNode, ctx);
      }

      return ctx.textContent(node as never);
    },
  };
}

function splice(source: string, start: number, end: number, edits: SourceEdit[]): string {
  // first edit starting inside the region
  let lo = 0;
  let hi = edits.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (edits[mid].start < start) lo = mid + 1;
    else hi = mid;
  }

  let out = '';
  let cursor = start;
  for (let i = lo; i < edits.length && edits[i].start < end; i++) {
    const edit = edits[i];
    if (edit.end > end) continue;

    out += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
    if (edit.text === '') {
      // a dropped node leaves its blank-line separation behind, keep at most one
      while (source[cursor] === '\n' && (out === '' || out.endsWith('\n\n'))) cursor++;
    }
  }

  return out + source.slice(cursor, end);
}

interface JsxElementNode extends PositionedNode {
  name?: string | null;
  attributes: (
    | { type: 'mdxJsxAttribute'; name: string; value?: string | { value: string } | null }
    | { type: 'mdxJsxExpressionAttribute'; value: string }
  )[];
}

/** the tag of a plugin-inserted JSX element, reconstructed from its fields */
function syntheticElement(node: JsxElementNode, ctx: MdastVisitorContext): string {
  let attrs = '';
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') {
      if (attr.value) attrs += ` {${attr.value}}`;
    } else if (attr.value == null) {
      attrs += ` ${attr.name}`;
    } else if (typeof attr.value === 'string') {
      attrs += ` ${attr.name}="${attr.value}"`;
    } else if (attr.value.value) {
      attrs += ` ${attr.name}={${attr.value.value}}`;
    }
  }

  const children = ctx.textContent(node as never);
  if (!children) return `<${node.name}${attrs} />`;
  return `<${node.name}${attrs}>${children}</${node.name}>`;
}
