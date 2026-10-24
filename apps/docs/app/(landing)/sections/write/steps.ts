/** a block of `quick-start.mdx` and how it plays */
export interface Step {
  /** status bar line while it compiles */
  status: string;
  /** the block's kind, on its balloon */
  kind: string;
  /** label of its slot's target frame */
  label: string;
  /** each glyph flies this many times */
  copies?: number;
  /** its heading gets a TOC entry */
  toc?: boolean;
  /** parts of the output that come after it lands, in reading order: a part led by a path
   * draws like a pen, the others dither in */
  late?: string;
}

export interface FileLine {
  text: string;
  /** the step that types it, a blank line between steps belongs to the next one */
  step: number;
}

/** the sources of the steps as one file */
export function fileLines(sources: string[]): FileLine[] {
  const out: FileLine[] = [];
  for (let i = 0; i < sources.length; i++) {
    if (i > 0) out.push({ text: '', step: i });
    for (const text of sources[i].trimEnd().split('\n')) out.push({ text, step: i });
  }
  return out;
}

export type Tone = 0 | 1 | 2;

/** ink, syntax (ink-2), numbers (orange) */
const SYNTAX =
  /(---|^#{1,6}(?= )|```\w*|<\/?|\/?>|[{}[\]()=:;,"']|\/\/.*$|\b(?:import|from|const|export)\b)|(\b\d+\b)/g;

/** split a source line into runs of one tone, for the editor and the glyph colours */
export function tokenize(line: string): [text: string, tone: Tone][] {
  const out: [string, Tone][] = [];
  let last = 0;
  for (const match of line.matchAll(SYNTAX)) {
    if (match.index > last) out.push([line.slice(last, match.index), 0]);
    out.push([match[0], match[1] ? 1 : 2]);
    last = match.index + match[0].length;
  }
  if (last < line.length) out.push([line.slice(last), 0]);
  return out;
}
