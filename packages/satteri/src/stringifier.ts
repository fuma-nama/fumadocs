import type { MdastVisitorContext } from 'satteri';

/**
 * The Markdown of a node. A string covers the edits inside the node made before it and blocks those made after, a
 * function runs when stringifying instead, and its `s.stringify()` & `s.inner()` apply the edits inside.
 */
export type Replacement = string | ((s: Stringifier) => string);

interface Range {
  start: number;
  end: number;
}

/** created with every field, so edits share one object shape */
interface Edit {
  start: number;
  end: number;
  text: Replacement;
  /** the range of the node that a range edit goes with */
  owner: Range | undefined;
  /** the namespace of a plugin's edit, every namespace if unset */
  namespace: string | undefined;
}

/** an embedded source, output in place of the `host` range */
interface Embed extends Range {
  host: Range;
}

declare module 'satteri' {
  interface DataMap {
    /** the edits of plugins, for the stringifiers of their namespace */
    _sourceEdits?: Edit[];
    /** sources embedded after the document's, e.g. included files */
    _embeddedSource?: string;
    _embeds?: Embed[];
  }
}

export interface PositionedNode {
  type?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  /** Sätteri drops the position of inserted nodes, they can carry one in `data` */
  data?: unknown;
}

interface ParentNode extends PositionedNode {
  children?: readonly ParentNode[];
}

export function offsets(node: PositionedNode): Range | undefined {
  const position = node.position ?? (node.data as PositionedNode | undefined)?.position;
  const start = position?.start.offset;
  const end = position?.end.offset;
  if (start !== undefined && end !== undefined) return { start, end };
}

/**
 * Replace the Markdown of an authored node, ignored without a position. The last edit of a node wins.
 *
 * @param namespace - limit the edit to the stringifiers of a namespace, like `search` for search records
 */
export function replaceSource(
  ctx: MdastVisitorContext,
  node: PositionedNode,
  text: Replacement,
  namespace?: 'search' | (string & {}),
): void {
  const range = offsets(node);
  if (range && range.end > range.start)
    (ctx.data._sourceEdits ??= []).push({
      start: range.start,
      end: range.end,
      text,
      owner: undefined,
      namespace,
    });
}

/**
 * Replace an authored node with `content`, its nodes parsed from another source (e.g. included files). Their
 * positions move into `data`, stringifiers place `source` after the document's own.
 */
export function embedSource(
  ctx: MdastVisitorContext,
  node: PositionedNode,
  source: string,
  content: ParentNode[],
): void {
  const host = offsets(node);
  if (!host) return;
  const embedded = ctx.data._embeddedSource ?? '';
  const base = ctx.source.length + embedded.length + 1;
  ctx.data._embeddedSource = `${embedded}\n${source}`;
  (ctx.data._embeds ??= []).push({ start: base, end: base + source.length, host });

  // the content as embedded, plugins may replace its nodes later
  let start: number | undefined;
  let end = 0;
  const visit = (nodes: readonly ParentNode[]) => {
    for (const child of nodes) {
      const range = offsets(child);
      if (range) {
        range.start += base;
        range.end += base;
        child.data = {
          ...(child.data as object),
          position: { start: { offset: range.start }, end: { offset: range.end } },
        };
        start ??= range.start;
        end = Math.max(end, range.end);
      }
      if (child.children) visit(child.children);
    }
  };
  visit(content);
  replaceSource(ctx, node, start === undefined ? '' : (s) => s.slice(start!, end));
}

/**
 * Markdown output backed by the authored source, requires `options: { position: true }` on the plugin. Nodes without
 * a position (e.g. inserted by plugins) only appear through replacements.
 */
export interface Stringifier {
  /** the document's source, followed by embedded sources */
  readonly source: string;
  /** replace a node in this output, after the edits of plugins */
  replace: (node: PositionedNode, text: Replacement) => void;
  /** replace a range of `source` in this output, an empty range inserts text, the edit goes with `node` if given */
  edit: (start: number, end: number, text: string, node?: PositionedNode) => void;
  /** a range of `source` as Markdown */
  slice: (start: number, end: number) => string;
  /** a node as Markdown, empty without a position */
  stringify: (node: PositionedNode) => string;
  /** the children of a node as Markdown, empty without positions */
  inner: (node: ParentNode) => string;
  /** whether `range` is output inside `outer`, embedded sources are output in place of the node they replace */
  within: (range: Range, outer: Range) => boolean;
}

/**
 * @param namespace - also apply the edits of this namespace, like `search` for search records
 */
export function createStringifier(
  ctx: MdastVisitorContext,
  namespace?: 'search' | (string & {}),
): Stringifier {
  const source = ctx.source + (ctx.data._embeddedSource ?? '');
  const embeds = ctx.data._embeds ?? [];
  const own: Edit[] = [];
  // replacements that are running, they don't apply inside themselves
  const active = new Set<Edit>();
  let edits: Edit[] | undefined;

  function getEdits(): Edit[] {
    if (edits) return edits;
    // the edits of plugins first, so the stringifier's own win
    edits = [];
    for (const edit of ctx.data._sourceEdits ?? [])
      if (edit.namespace === undefined || edit.namespace === namespace) edits.push(edit);
    for (const edit of own) edits.push(edit);
    // an outer edit comes first, edits of the same range keep their order
    return edits.sort((a, b) => a.start - b.start || b.end - a.end);
  }

  /** the index of the first edit starting at or after `offset` */
  function search(list: Edit[], offset: number): number {
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].start < offset) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function render(start: number, end: number): string {
    const list = getEdits();
    let out = '';
    let cursor = start;
    // the last applied replacement, covering the edits inside it
    let appliedStart = start;
    let appliedEnd = start;
    for (let i = search(list, start); i < list.length; i++) {
      const edit = list[i];
      if (edit.start > end) break;
      if (edit.start < appliedEnd || edit.end > end || active.has(edit)) continue;

      // the last edit of a range wins
      const next = i + 1 < list.length ? list[i + 1] : undefined;
      if (edit.end > edit.start && next && next.start === edit.start && next.end === edit.end)
        continue;

      const owner = edit.owner;
      // only with its whole node, when it isn't replaced
      if (
        owner &&
        (owner.start < start ||
          owner.end > end ||
          (owner.start >= appliedStart && owner.end <= appliedEnd))
      )
        continue;

      let text = edit.text;
      if (typeof text !== 'string') {
        active.add(edit);
        text = text(s);
        active.delete(edit);
      }

      out += source.slice(cursor, edit.start);
      if (edit.start === edit.end) {
        out += text;
      } else {
        out += indent(source, edit.start, text);
        appliedStart = edit.start;
        appliedEnd = edit.end;
      }
      cursor = edit.end;
    }

    return out + source.slice(cursor, end);
  }

  const s: Stringifier = {
    source,
    replace(node, text) {
      const range = offsets(node);
      if (!range || range.end === range.start) return;
      own.push({
        start: range.start,
        end: range.end,
        text,
        owner: undefined,
        namespace: undefined,
      });
      edits = undefined;
    },
    edit(start, end, text, node) {
      own.push({ start, end, text, owner: node && offsets(node), namespace: undefined });
      edits = undefined;
    },
    slice(start, end) {
      return dedent(source, start, render(start, end));
    },
    stringify(node) {
      const range = offsets(node);
      return range ? s.slice(range.start, range.end) : '';
    },
    inner(node) {
      const range = offsets(node);
      if (!range) return '';
      const first = edge(node.children, false);
      const last = edge(node.children, true);
      let start = (first && lift(first, range)?.start) ?? range.end;
      let end = (last && lift(last, range)?.end) ?? range.start;
      // children replaced by plugins are in it through their edits
      const list = getEdits();
      for (let i = search(list, range.start + 1); i < list.length; i++) {
        const edit = list[i];
        if (edit.start >= range.end) break;
        if (edit.end > range.end) continue;
        start = Math.min(start, edit.start);
        end = Math.max(end, edit.end);
      }
      return end > start ? s.slice(start, end) : '';
    },
    within: (range, outer) => lift(range, outer) !== undefined,
  };

  /** `range` as output inside `outer`, embedded sources are output in place of the node they replace */
  function lift(range: Range, outer: Range): Range | undefined {
    while (range.start < outer.start || range.end > outer.end) {
      const embed = embeds.find((item) => range.start >= item.start && range.end <= item.end);
      if (!embed) return;
      range = embed.host;
    }
    return range;
  }

  return s;
}

/** the first or last node with a position, looking into the children of nodes without one */
function edge(nodes: readonly ParentNode[] = [], last: boolean): Range | undefined {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[last ? nodes.length - 1 - i : i];
    const range = offsets(node) ?? edge(node.children, last);
    if (range) return range;
  }
}

const containerPrefixRegex = /^(?:[ \t]*(?:>|[-*+](?=[ \t])|\d{1,9}[.)](?=[ \t])))*[ \t]*/;

/** the prefix of the containers (e.g. lists & blockquotes) at `start`, on the lines after the first */
function containerPrefix(source: string, start: number): string {
  const line = source.slice(source.lastIndexOf('\n', start - 1) + 1, start);
  return containerPrefixRegex.exec(line)![0].replace(/[^\t>]/g, ' ');
}

/** Markdown placed at `start`, continuing its containers, blank lines only carry their markers (e.g. `>`) */
function indent(source: string, start: number, text: string): string {
  if (!text.includes('\n')) return text;
  const prefix = containerPrefix(source, start);
  if (!prefix) return text;
  return text.replace(/\n(?=(.?))/g, (_, next: string) => `\n${next ? prefix : prefix.trimEnd()}`);
}

/** Markdown sliced from `start`, without the prefixes of its containers */
function dedent(source: string, start: number, text: string): string {
  if (!text.includes('\n')) return text;
  const prefix = containerPrefix(source, start);
  if (!prefix) return text;
  // the prefix only has whitespace & `>`
  return text.replace(new RegExp(`\\n(?:${prefix}|${prefix.trimEnd()}(?=\\r?\\n|$))`, 'g'), '\n');
}
