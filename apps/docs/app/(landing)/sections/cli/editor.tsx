import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Window } from '../../ui/window';
import type { Change, Source } from './data';

const KEYWORDS = /\b(import|from|export|function|return|default)\b/g;
const SEPARATORS = "/-[] '.";

/** a piece of code, keywords dimmed */
function tone(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(KEYWORDS)) {
    if (match.index > last) out.push(code.slice(last, match.index));
    out.push(
      <span key={match.index} className="text-lp-ink-2">
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/** `code` with `change` made, in pieces: the part that changes is kept to whole path segments and
 * words (`1.75` -> `2.5` changes it all) */
function split(code: string, { from, to }: Change) {
  let head = 0;
  while (head < from.length && head < to.length && from[head] === to[head]) head++;
  while (head > 0 && !SEPARATORS.includes(from[head - 1])) head--;
  let tail = 0;
  while (
    tail < from.length - head &&
    tail < to.length - head &&
    from[from.length - 1 - tail] === to[to.length - 1 - tail]
  )
    tail++;
  while (tail > 0 && !SEPARATORS.includes(from[from.length - tail])) tail--;
  const at = code.indexOf(from);
  return {
    before: code.slice(0, at) + from.slice(0, head),
    old: from.slice(head, from.length - tail),
    next: to.slice(head, to.length - tail),
    after: from.slice(from.length - tail) + code.slice(at + from.length),
  };
}

/**
 * The line as it reads after the change, the changing part a `data-cut` span that knows both
 * versions so the scene can write it again. The versions lie under it unseen, so the line keeps the
 * box of the longer one while it is rewritten; an `added` line only ever shows the new one.
 */
function Changed({ code, change, added }: { code: string; change: Change; added?: boolean }) {
  const { before, old, next, after } = split(code, change);
  return (
    <code className="grid *:col-start-1 *:row-start-1">
      {!added && (
        <span aria-hidden className="invisible">
          {before}
          {old}
          {after}
        </span>
      )}
      <span aria-hidden className="invisible">
        {before}
        {next}
        {after}
      </span>
      <span>
        {tone(before)}
        <span data-cut data-old={old} data-new={next}>
          {next}
        </span>
        {after}
      </span>
    </code>
  );
}

/**
 * A numbered line as an editor soft-wraps it: the number is pseudo content, so a copy takes the code
 * only, then the diff's sign; the indent is padding and a wrapped row hangs 2 columns in.
 */
function Line({
  n,
  code,
  sign,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { n: number; code: string; sign?: string }) {
  const indent = code.length - code.trimStart().length;
  return (
    <div
      {...props}
      data-n={n}
      className={cn(
        'flex gap-2 before:w-[3ch] before:shrink-0 before:text-end before:text-lp-ink-2 before:content-[attr(data-n)]',
        className,
      )}
    >
      <span aria-hidden data-sign className="w-[1ch] shrink-0 select-none">
        {sign}
      </span>
      <span
        className="min-w-0 flex-1 -indent-[2ch]"
        style={{ paddingInlineStart: `${indent + 2}ch` }}
      >
        {children ?? <code>{tone(code.trimStart())}</code>}
      </span>
    </div>
  );
}

/**
 * A rewired import as a diff: the line that pointed at the package, struck, the line that points at
 * your copy under it. Until the scene rewrites it (`data-diff` off) the old line reads as code, the
 * new one keeps its place unseen.
 */
function Diff({ code, rewire }: { code: string; rewire: Change }) {
  const was = code.replace(rewire.to, rewire.from);
  const { before, old, after } = split(was.trimStart(), rewire);
  return (
    <div data-rewire data-diff className="group flex flex-col">
      <Line
        n={rewire.line}
        code={was}
        sign="-"
        className="group-data-diff:text-lp-ink-2 group-data-diff:[&_code]:line-through group-[:not([data-diff])]:[&_[data-sign]]:invisible"
      >
        <code>
          {tone(before)}
          <span data-from>{old}</span>
          {after}
        </code>
      </Line>
      <Line
        n={rewire.line}
        code={code}
        sign="+"
        className="bg-lp-yellow/40 group-[:not([data-diff])]:invisible dark:bg-lp-yellow/15"
      >
        <Changed code={was.trimStart()} change={rewire} added />
      </Line>
    </div>
  );
}

/**
 * Your project in an editor: the files the run changes as tabs, each showing its lines around the
 * change, an import rewired as a diff, your edit in place. It opens on the file you edit.
 */
export function Editor({
  id,
  sources,
  className,
}: {
  id: string;
  sources: Source[];
  className?: string;
}) {
  const open = sources.findIndex((source) => source.edit);
  const tabs: ReactNode[] = [];
  const panels: ReactNode[] = [];
  for (let i = 0; i < sources.length; i++) {
    const { file, target, hunks, rewires, edit } = sources[i];
    tabs.push(
      <button
        key={file}
        type="button"
        role="tab"
        id={`${id}-tab-${i}`}
        aria-controls={`${id}-panel-${i}`}
        aria-selected={i === open}
        data-tab
        data-file={file}
        data-target={target}
        className="flex h-7 shrink-0 items-center px-3 font-mono text-xs text-lp-ink-2 transition-none hover:text-lp-ink focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-lp-ink aria-selected:bg-lp-paper-2 aria-selected:text-lp-ink md:h-8"
      >
        {file.slice(file.lastIndexOf('/') + 1)}
      </button>,
    );
    const rows: ReactNode[] = [];
    for (let k = 0; k < hunks.length; k++) {
      // the lines in between, folded
      if (k > 0)
        rows.push(
          <div
            key={`fold-${k}`}
            aria-hidden
            className="my-1.5 border-t border-dashed border-lp-line-strong/40"
          />,
        );
      for (let j = 0; j < hunks[k].lines.length; j++) {
        const n = hunks[k].line + j;
        const code = hunks[k].lines[j];
        const rewire = rewires?.find((change) => change.line === n);
        if (rewire) rows.push(<Diff key={n} code={code} rewire={rewire} />);
        else if (edit?.line === n)
          rows.push(
            <Line key={n} data-edit-line n={n} code={code}>
              <Changed code={code.trimStart()} change={edit} />
            </Line>,
          );
        else rows.push(<Line key={n} n={n} code={code} />);
      }
    }
    panels.push(
      <div
        key={file}
        role="tabpanel"
        id={`${id}-panel-${i}`}
        aria-labelledby={`${id}-tab-${i}`}
        data-panel
        inert={i !== open}
        className="col-start-1 row-start-1 flex flex-col px-3 py-2 inert:invisible md:py-3 md:pe-4"
      >
        {rows}
      </div>,
    );
  }
  return (
    <Window
      data-editor
      title={<span data-title>{sources[open].file}</span>}
      className={cn(
        'font-mono text-[11px] leading-4 [font-variant-ligatures:none] md:text-xs md:leading-5',
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          role="tablist"
          aria-label="Files"
          className="flex border-b border-lp-line-strong md:w-max md:shrink-0 md:flex-col md:border-e md:border-b-0"
        >
          {tabs}
        </div>
        {/* every file in one place: the editor keeps the size of the longest */}
        <div className="grid min-w-0 flex-1">{panels}</div>
      </div>
    </Window>
  );
}
