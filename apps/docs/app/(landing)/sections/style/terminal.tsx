import { cn } from '@/lib/cn';
import { Command } from '../../ui/command';
import { Window } from '../../ui/window';
import { COMMAND, DEPENDENCIES, EDIT, type Prompt, SESSION, type Span, type Tone } from './session';

const TONES: Record<Tone, string> = {
  0: '',
  1: 'text-lp-ink-2',
  2: 'text-lp-orange',
  3: 'bg-lp-ink text-lp-paper',
};

const text = 'font-mono text-[11px] leading-4 whitespace-pre-wrap [font-variant-ligatures:none]';

/** clack's guide, drawn as lines so it runs through the line height like a terminal's cells */
function Guide({ span: [char, tone] }: { span: Span }) {
  const color = tone === 2 ? 'border-lp-orange' : 'border-lp-ink-2';
  if (char === '│')
    return <span className={cn('absolute inset-y-0 left-[0.5ch] border-s', color)} />;
  if (char === '┌' || char === '└')
    return (
      <>
        <span
          className={cn(
            'absolute left-[0.5ch] border-s',
            char === '┌' ? 'top-1/2 bottom-0' : 'top-0 bottom-1/2',
            color,
          )}
        />
        <span className={cn('absolute top-1/2 left-[0.5ch] w-[1.5ch] border-t', color)} />
      </>
    );
  return <span className={TONES[tone]}>{char}</span>;
}

/** `box()` of clack with the guide before it: a titled frame across the terminal */
function Box() {
  return (
    <span className="relative my-2 block border border-lp-ink px-[2ch] py-2">
      <span className="absolute -top-2 left-[1ch] bg-lp-paper px-[1ch] leading-4">
        New Dependencies
      </span>
      {DEPENDENCIES.map((name) => (
        <span key={name} className="block">
          {name}
        </span>
      ))}
    </span>
  );
}

/**
 * The CLI session at `step`, the command on top. Every line keeps its place from the start, so the
 * transcript never moves; a line still working is a spinner, a prompt still asking is a window
 * open on the line its answer prints on. A wrapped line hangs after the guide.
 */
export function Terminal({ step }: { step: number }) {
  const lines = [];
  for (let i = 0; i < SESSION.length; i++) {
    const line = SESSION[i];
    const working = line.done !== undefined && step < line.done;
    lines.push(
      <div
        key={i}
        data-line
        className={cn('flex min-h-4 shrink-0', step < line.from && 'invisible')}
      >
        <span className="relative w-[3ch] shrink-0">
          <Guide span={working ? ['◒', 2] : line.guide} />
        </span>
        <span className="relative min-w-0 flex-1">
          {line.box ? (
            <Box />
          ) : working ? (
            // the installer rolls the files it writes through this text, its only child
            <span data-spinner>{line.working}</span>
          ) : (
            line.spans.map(([value, tone], j) => (
              <span key={j} className={TONES[tone]}>
                {value}
              </span>
            ))
          )}
          {line.prompt?.step === step && <PromptWindow prompt={line.prompt} />}
        </span>
      </div>,
    );
  }

  return (
    <div className="flex flex-col">
      <Command command={COMMAND} className="w-full shrink-0 border-0 border-b" />
      <div data-session className={cn('px-4 py-3', text)}>
        {lines}
      </div>
    </div>
  );
}

/** a prompt of the session lifted out of the terminal into a window of its own */
function PromptWindow({ prompt }: { prompt: Prompt }) {
  const options = [];
  for (let i = 0; i < prompt.options.length; i++) {
    const [label, hint] = prompt.options[i];
    // a confirm lists its answers on one line: `● Yes / ○ No`
    if (i > 0 && prompt.kind === 'confirm') {
      options.push(
        <li key={label} className="text-lp-ink-2">
          {' / ○ '}
          {label}
        </li>,
      );
      continue;
    }
    options.push(
      <li
        key={label}
        className={cn(
          'flex gap-[1ch]',
          prompt.kind === 'select' && 'px-4',
          i === 0 ? 'bg-lp-yellow text-[#121210]' : 'text-lp-ink-2',
        )}
      >
        <span>{i === 0 ? '●' : '○'}</span>
        <span>
          {label}
          {i === 0 && hint && <span className="opacity-60"> ({hint})</span>}
        </span>
      </li>,
    );
  }

  return (
    <Window
      title="@fumadocs/cli"
      aria-hidden
      // its line is still hidden, the window shows
      className="visible absolute top-0 left-0 z-10 w-[min(380px,100%)]"
    >
      <div className="py-3">
        <p className="mb-2 px-4">
          <span className="text-lp-orange">◆</span>
          {'  '}
          {prompt.message}
        </p>
        <ol className={prompt.kind === 'confirm' ? 'flex px-4' : undefined}>{options}</ol>
      </div>
    </Window>
  );
}

/**
 * A line of code as an editor soft-wraps it: its indentation is padding and a wrapped line hangs 4
 * columns in, so no space hangs at the end of a row.
 */
function Code({ line, className }: { line: string; className?: string }) {
  const indent = line.length - line.trimStart().length;
  return (
    <span
      className={cn('min-w-0 flex-1 -indent-[4ch] whitespace-normal', className)}
      style={{ paddingInlineStart: `${indent + 4}ch` }}
    >
      {line.trimStart()}
    </span>
  );
}

/**
 * `DocsTitle` in your copy of the layout; once `edited`, its title class changed. The new line
 * keeps its place before, so the file never moves.
 */
export function Edit({ edited = true }: { edited?: boolean }) {
  const rows = [];
  for (let i = 0; i < EDIT.lines.length; i++) {
    const line = EDIT.lines[i];
    if (i === EDIT.at) {
      // the markers are pseudo content, a copy takes the code only
      rows.push(
        <div
          key="-"
          className={cn(
            'flex before:w-[2ch] before:shrink-0',
            edited && "text-lp-ink-2 before:content-['-']",
          )}
        >
          <Code line={line} className={edited ? 'line-through' : undefined} />
        </div>,
        <div
          key="+"
          className={cn(
            "-mx-3 flex bg-lp-yellow px-3 text-[#121210] before:w-[2ch] before:shrink-0 before:content-['+']",
            !edited && 'invisible',
          )}
        >
          <Code line={line.replace(EDIT.from, EDIT.to)} />
        </div>,
      );
      continue;
    }
    rows.push(
      <div key={i} className="flex ps-[2ch]">
        <Code line={line} />
      </div>,
    );
  }
  return <div className={cn('px-3 py-3', text)}>{rows}</div>;
}
