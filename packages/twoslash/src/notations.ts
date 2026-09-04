/**
 * Twoslash notations: https://twoslash.netlify.app/refs/notations
 */
export type Range = [start: number, end: number];

export interface Position {
  /** 0-indexed line number */
  line: number;
  /** 0-indexed character number */
  character: number;
}

export interface NodeBase extends Position {
  start: number;
  length: number;
}

export interface NodeHover extends NodeBase {
  type: 'hover';
  /** the identifier this node represents */
  target: string;
  text: string;
  docs?: string;
  tags?: [name: string, text: string | undefined][];
}

export interface NodeQuery extends Omit<NodeHover, 'type'> {
  type: 'query';
}

export interface NodeHighlight extends NodeBase {
  type: 'highlight';
  text?: string;
}

export interface CompletionEntry {
  name: string;
  kind?: string;
}

export interface NodeCompletion extends NodeBase {
  type: 'completion';
  completions: CompletionEntry[];
  completionsPrefix: string;
}

export type ErrorLevel = 'warning' | 'error' | 'suggestion' | 'message';

export interface NodeError extends NodeBase {
  type: 'error';
  level: ErrorLevel;
  code: number;
  text: string;
  filename: string;
}

export interface NodeTag extends NodeBase {
  type: 'tag';
  name: string;
  text?: string;
}

export type TwoslashNode =
  | NodeHover
  | NodeQuery
  | NodeHighlight
  | NodeCompletion
  | NodeError
  | NodeTag;

export type NodeWithoutPosition<T = TwoslashNode> = T extends unknown
  ? Omit<T, keyof Position>
  : never;

export interface HandbookOptions {
  /** error codes expected in the code block */
  errors: number[];
  /** suppress all errors, or the given error codes */
  noErrors: boolean | number[];
  /** suppress errors in the cut regions */
  noErrorsCutted: boolean;
  /** don't check that errors are marked as expected */
  noErrorValidation: boolean;
  /** disable hover info of identifiers */
  noStaticSemanticInfo: boolean;
  /** keep the notations in the output code */
  keepNotations: boolean;
  /** show the emitted JavaScript instead, not supported by TypeScript 7 */
  showEmit: boolean;
  showEmittedFile?: string;
}

export const defaultHandbookOptions: HandbookOptions = {
  errors: [],
  noErrors: false,
  noErrorsCutted: false,
  noErrorValidation: false,
  noStaticSemanticInfo: false,
  keepNotations: false,
  showEmit: false,
  showEmittedFile: undefined,
};

export interface VirtualFile {
  /** offset of the content in the code block */
  offset: number;
  filename: string;
  filepath: string;
  content: string;
  extension: string;
  /** extra content of the file, not part of the code block */
  prepend?: string;
  append?: string;
}

export class TwoslashError extends Error {
  constructor(
    public title: string,
    public description: string,
    public recommendation = '',
  ) {
    super(`\n## ${title}\n\n${description}\n${recommendation ? `\n${recommendation}` : ''}`);
  }
}

export interface Notations {
  compilerOptions: Record<string, unknown>;
  handbookOptions: HandbookOptions;
  tags: NodeWithoutPosition<NodeTag>[];
  removals: Range[];
  queries: number[];
  completions: number[];
  highlights: [start: number, end: number, text?: string][];
}

const reFlag = /^\/\/\s?@(\w+)(?::\s?(.+))?$/gm;
const reMarker = /^\s*\/\/\s*\^(\?|\||\^+)( .*)?$/gm;
const reCut = /^\/\/\s?---cut(-before|-after|-start|-end)?---$/;
const reFilename = /^[\t\v\f ]*\/\/\s?@filename: (.+)$/gm;

function parseFlagValue(value: string | undefined): unknown {
  if (value === undefined || value === 'true') return true;
  if (value === 'false') return false;
  if (value.includes(',')) return value.split(',').map((v) => v.trim());
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

/**
 * Parse `// @flag` and `// @flag: value` lines.
 *
 * Compiler flags are kept as raw values, they're validated by TypeScript when loading the config.
 */
export function findFlagNotations(
  code: string,
  customTags: string[],
  options: Pick<Notations, 'compilerOptions' | 'handbookOptions' | 'tags' | 'removals'>,
) {
  for (const match of code.matchAll(reFlag)) {
    const [text, name, value] = match;
    const range: Range = [match.index, match.index + text.length + 1];
    if (name === 'filename') continue;

    if (customTags.includes(name)) {
      options.tags.push({ type: 'tag', name, start: range[1], length: 0, text: value });
    } else if (name === 'errors') {
      options.handbookOptions.errors = (value ?? '').split(' ').map(Number);
    } else if (name === 'noErrors') {
      const parsed = parseFlagValue(value);
      options.handbookOptions.noErrors =
        typeof parsed === 'boolean' ? parsed : (value ?? '').split(' ').map(Number);
    } else if (name in defaultHandbookOptions) {
      Object.assign(options.handbookOptions, { [name]: parseFlagValue(value) });
    } else {
      options.compilerOptions[name] = parseFlagValue(value);
    }
    options.removals.push(range);
  }
}

/**
 * Find `// ---cut---` notations, the removed ranges are pushed to `removals`
 */
export function findCutNotations(code: string, removals: Range[]) {
  const cuts: Range[] = [];
  const cutStarts: number[] = [];
  let index = 0;
  for (const line of code.split('\n')) {
    const end = index + line.length + 1;
    const match = reCut.exec(line.trim());
    if (match) {
      const kind = match[1] ?? '';
      if (kind === '' || kind === '-before') {
        cuts.splice(0, cuts.length, [0, end]);
      } else if (kind === '-after') {
        cuts.push([index, code.length]);
        break;
      } else if (kind === '-start') {
        cutStarts.push(index);
      } else {
        const start = cutStarts.pop();
        if (start === undefined) {
          throw new TwoslashError('Mismatched cut markers', 'Found a cut-end without cut-start.');
        }
        cuts.push([start, end]);
      }
    }
    index = end;
  }
  if (cutStarts.length > 0) {
    throw new TwoslashError('Mismatched cut markers', 'Found a cut-start without cut-end.');
  }
  removals.push(...cuts);
}

/**
 * Find `^?`, `^|` and `^^^` markers, they point to the position of the previous line
 */
export function findQueryMarkers(
  code: string,
  pc: PositionConverter,
  notations: Pick<Notations, 'removals' | 'queries' | 'completions' | 'highlights'>,
) {
  const queriedLines = new Set<number>();
  for (const match of code.matchAll(reMarker)) {
    const [text, kind, message] = match;
    notations.removals.push([match.index, match.index + text.length + 1]);
    const markerIndex = match.index + text.indexOf('^');
    const pos = pc.indexToPos(markerIndex);
    let targetLine = pos.line - 1;
    while (queriedLines.has(targetLine) && targetLine >= 0) targetLine--;
    const target = pc.posToIndex(targetLine, pos.character);

    if (kind === '?') notations.queries.push(target);
    else if (kind === '|') notations.completions.push(target);
    else notations.highlights.push([target, target + kind.length + 1, message?.trim()]);
    queriedLines.add(pos.line);
  }
}

/**
 * Split the code block into virtual files by `// @filename:` notations
 */
export function splitFiles(code: string, defaultFilename: string, dir: string): VirtualFile[] {
  const files: VirtualFile[] = [];
  let filename = defaultFilename;
  let index = 0;

  function push(end: number) {
    if (end === index) return;
    files.push({
      offset: index,
      filename,
      filepath: dir + filename,
      content: code.slice(index, end),
      extension: filename.slice(filename.lastIndexOf('.') + 1),
    });
  }

  for (const match of code.matchAll(reFilename)) {
    push(match.index);
    filename = match[1].trimEnd();
    index = match.index;
  }
  push(code.length);
  return files;
}

export interface PositionConverter {
  indexToPos: (index: number) => Position;
  posToIndex: (line: number, character: number) => number;
}

export function createPositionConverter(code: string): PositionConverter {
  const lines = code.split(/(?<=\n)/);
  return {
    indexToPos(index) {
      let character = index;
      let line = 0;
      for (const text of lines) {
        if (character < text.length) break;
        character -= text.length;
        line++;
      }
      return { line, character };
    },
    posToIndex(line, character) {
      let index = character;
      for (let i = 0; i < line; i++) index += lines[i].length;
      return index;
    },
  };
}

export function isInRange(index: number, range: Range, inclusive = true): boolean {
  return inclusive ? range[0] <= index && index <= range[1] : range[0] < index && index < range[1];
}

export function isInRanges(index: number, ranges: Range[], inclusive = true): boolean {
  return ranges.some((range) => isInRange(index, range, inclusive));
}

/**
 * Remove ranges from the code, and shift the positions of nodes accordingly. Nodes in removed ranges are dropped.
 */
export function removeCodeRanges(
  code: string,
  removals: Range[],
  nodes: NodeWithoutPosition[],
): { code: string; nodes: NodeWithoutPosition[] } {
  const ranges = removals.toSorted((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && last[1] >= range[0]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }

  for (const [start, end] of merged.toReversed()) {
    code = code.slice(0, start) + code.slice(end);
    for (const node of nodes) {
      if (node.start + node.length <= start) continue;
      if (node.start < end) node.start = -1;
      else node.start -= end - start;
    }
  }
  return { code, nodes: nodes.filter((node) => node.start >= 0) };
}

export function resolveNodePositions(
  nodes: NodeWithoutPosition[],
  pc: PositionConverter,
): TwoslashNode[] {
  const resolved = nodes.toSorted((a, b) => a.start - b.start || a.type.localeCompare(b.type));
  return resolved.map((node) => ({ ...node, ...pc.indexToPos(node.start) }) as TwoslashNode);
}

export function validateCodeForErrors(
  errors: NodeWithoutPosition<NodeError>[],
  handbookOptions: HandbookOptions,
) {
  const unexpected = errors.filter((e) => !handbookOptions.errors.includes(e.code));
  if (unexpected.length === 0) return;

  const codes = Array.from(new Set(unexpected.map((e) => e.code))).join(' ');
  const expected = Array.from(new Set(errors.map((e) => e.code))).join(' ');
  throw new TwoslashError(
    'Errors were thrown in the sample, but not included in an error tag',
    `These errors were not marked as being expected: ${codes}. ${
      handbookOptions.errors.length > 0
        ? `The existing annotation specified ${handbookOptions.errors.join(' ')}`
        : `Expected: // @errors: ${expected}`
    }`,
    `Compiler Errors:\n\n${unexpected.map((e) => `[${e.code}] ${e.filename}:${e.start} - ${e.text}`).join('\n')}`,
  );
}
