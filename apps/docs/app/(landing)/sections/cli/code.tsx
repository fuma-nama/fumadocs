import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Window } from '../../ui/window';
import type { Edit, Rewire } from './data';

const KEYWORDS = /\b(import|from|export|function|return)\b/g;
const SEPARATORS = "/-[] '";

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

/**
 * `code` with `from` changed to `to`, as it reads after: the characters that change are a
 * `data-cut` span that knows both versions, so the scene can write them again. Both versions lie
 * under it unseen, so the line keeps the box of the longer one while it is rewritten.
 */
function Changed({ code, from, to }: { code: string; from: string; to: string }) {
  // the common start and end, kept to whole path segments and words: `1.75` -> `2.5` changes it all
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
  const before = code.slice(0, at);
  const after = code.slice(at + from.length);
  return (
    <code className="grid *:col-start-1 *:row-start-1">
      <span aria-hidden className="invisible">
        {before}
        {from}
        {after}
      </span>
      <span aria-hidden className="invisible">
        {before}
        {to}
        {after}
      </span>
      <span>
        {tone(before)}
        {to.slice(0, head)}
        <span
          data-cut
          data-old={from.slice(head, from.length - tail)}
          data-new={to.slice(head, to.length - tail)}
        >
          {to.slice(head, to.length - tail)}
        </span>
        {to.slice(to.length - tail)}
        {after}
      </span>
    </code>
  );
}

const text = 'font-mono text-xs leading-5 [font-variant-ligatures:none]';

/**
 * A numbered line of code as an editor soft-wraps it: the number is pseudo content (a copy takes the
 * code only), the indent is padding and a wrapped row hangs 2 columns in, so no space hangs at its end.
 */
function Line({
  n,
  code,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { n: number; code: string }) {
  const indent = code.length - code.trimStart().length;
  return (
    <div
      {...props}
      data-n={n}
      className={cn(
        'flex gap-3 before:w-[3ch] before:shrink-0 before:text-end before:text-lp-ink-2 before:content-[attr(data-n)]',
        className,
      )}
    >
      <span
        className="min-w-0 flex-1 -indent-[2ch]"
        style={{ paddingInlineStart: `${indent + 2}ch` }}
      >
        {children}
      </span>
    </div>
  );
}

/** the imports a command points at your copy, rewired; files named when they differ */
export function Imports({ rewires }: { rewires: Rewire[] }) {
  let dir = rewires[0].file;
  let shared = true;
  for (const rewire of rewires) {
    if (rewire.file !== dir) shared = false;
    while (!rewire.file.startsWith(dir)) dir = dir.slice(0, dir.lastIndexOf('/'));
  }
  const rows: ReactNode[] = [];
  for (let i = 0; i < rewires.length; i++) {
    const rewire = rewires[i];
    rows.push(
      <div key={i} data-rewire={i} data-target={rewire.target} className="flex flex-col">
        {!shared && (
          <p className="ps-[calc(3ch+12px)] text-lp-ink-2">{rewire.file.slice(dir.length + 1)}</p>
        )}
        <Line data-line n={rewire.line} code={rewire.code}>
          <Changed code={rewire.code} from={rewire.from} to={rewire.to} />
        </Line>
      </div>,
    );
  }
  return (
    <Window data-imports title={dir} className={text}>
      <div className={cn('flex flex-col px-4 py-3', !shared && 'gap-2')}>{rows}</div>
    </Window>
  );
}

/** your edit in your copy, made */
export function EditLines({ edit }: { edit: Edit }) {
  const rows: ReactNode[] = [];
  for (let i = 0; i < edit.lines.length; i++) {
    const code = edit.lines[i];
    rows.push(
      <Line key={i} n={edit.line + i} code={code}>
        {i === edit.at ? (
          <Changed code={code.trimStart()} from={edit.from} to={edit.to} />
        ) : (
          <code>{tone(code.trimStart())}</code>
        )}
      </Line>,
    );
  }
  return (
    <Window data-edit title={edit.file} className={text}>
      <div className="flex flex-col px-4 py-3">{rows}</div>
    </Window>
  );
}
