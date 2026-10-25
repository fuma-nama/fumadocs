/** a block of `quick-start.mdx` and how it is pressed */
export interface Step {
  /** its Markdown, on the tab the arm grips */
  tab: string;
  /** status bar line while it is pressed */
  status: string;
}

/** ink, syntax (ink-2), numbers (orange) */
const SYNTAX =
  /(---|^#{1,6}(?= )|```\w*|<\/?|\/?>|[{}[\]()=:;,"']|\/\/.*$|\b(?:import|from|const|export)\b)|(\b\d+\b)/g;

/** split a source line into runs of one tone */
export function tokenize(line: string): [text: string, tone: 0 | 1 | 2][] {
  const out: [string, 0 | 1 | 2][] = [];
  let last = 0;
  for (const match of line.matchAll(SYNTAX)) {
    if (match.index > last) out.push([line.slice(last, match.index), 0]);
    out.push([match[0], match[1] ? 1 : 2]);
    last = match.index + match[0].length;
  }
  if (last < line.length) out.push([line.slice(last), 0]);
  return out;
}
