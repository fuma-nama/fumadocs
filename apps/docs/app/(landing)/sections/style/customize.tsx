'use client';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { cn } from '@/lib/cn';
import { TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { DitherSwap } from '../../ui/dither';
import { Window } from '../../ui/window';
import { EDIT, INSTALLED, ROLL, TIMELINE } from './session';
import { Edit, Terminal } from './terminal';

interface Entry {
  files: string[];
  folders: Map<string, Entry>;
}

/** the installed files as folders, folders first */
function tree(paths: string[]): Entry {
  const root: Entry = { files: [], folders: new Map() };
  for (const path of paths) {
    const parts = path.split('/');
    let entry = root;
    for (let i = 0; i < parts.length - 1; i++) {
      let next = entry.folders.get(parts[i]);
      if (!next) {
        next = { files: [], folders: new Map() };
        entry.folders.set(parts[i], next);
      }
      entry = next;
    }
    entry.files.push(parts[parts.length - 1]);
  }
  return root;
}

/** `layouts/docs` is open: the layout you own */
const OPEN = new Set(['layouts', 'layouts/docs']);

function renderTree(entry: Entry, path: string): ReactNode[] {
  const out: ReactNode[] = [];
  for (const [name, child] of [...entry.folders].sort(([a], [b]) => a.localeCompare(b))) {
    const at = path ? `${path}/${name}` : name;
    out.push(
      <Folder key={at} name={name} defaultOpen={OPEN.has(at)}>
        {renderTree(child, at)}
      </Folder>,
    );
  }
  for (const name of [...entry.files].sort())
    out.push(<File key={`${path}/${name}`} name={name} />);
  return out;
}

const installed = tree(INSTALLED);

/** the last step: the session is done and your edit is in */
const DONE = TIMELINE.length - 1;
const SPIN = '◒◐◓◑';
const STATUS = [
  'customize',
  'customize',
  'customize',
  'installing layouts/docs',
  'customize',
  'installing dependencies',
  'customize: docs',
  'edit: DocsTitle',
];

/** a replay control, an icon like the copy button's */
function Replay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Run again"
      onClick={onClick}
      className="relative flex size-5 items-center justify-center bg-lp-paper text-lp-ink transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink"
    >
      <svg
        aria-hidden
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        className="size-2.5 fill-current"
      >
        <path d="M1 0h1v8H1zM2 1h1v6H2zM3 2h1v4H3zM4 3h1v2H4z" />
      </svg>
    </button>
  );
}

/**
 * `npx @fumadocs/cli customize`: the session plays once when it comes into view, a replay plays
 * it again. The server renders it done, like it rests once played.
 */
export function Customize() {
  const [step, setStep] = useState(DONE);
  const timers = useRef<number[]>([]);
  const root = useRef<HTMLDivElement>(null);

  const stop = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const play = useCallback(() => {
    stop();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(DONE);
      return;
    }
    const start = performance.now();
    for (let i = 0; i < TIMELINE.length; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setStep(i);
          if (root.current) report(root.current, STATUS[i]);
        }, TIMELINE[i]),
      );
    }
    // the spinner rolls through the files the installer writes
    for (let i = 0; i * ROLL < TIMELINE[4] - TIMELINE[3]; i++) {
      timers.current.push(
        window.setTimeout(
          () => {
            const line = root.current?.querySelector<HTMLElement>('[data-spinner]');
            if (!line) return;
            line.textContent = INSTALLED[Math.min(i, INSTALLED.length - 1)];
            const glyph = line.closest('[data-line]')?.firstElementChild?.firstElementChild;
            if (glyph) glyph.textContent = SPIN[Math.floor((performance.now() - start) / TICK) % 4];
          },
          TIMELINE[3] + i * ROLL,
        ),
      );
    }
  }, [stop]);

  useEffect(() => {
    const element = root.current!;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let first = true;
    let played = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // on screen already: it stays done, the replay is there
        if (first) {
          first = false;
          if (entry.intersectionRatio > 0) {
            played = true;
            return;
          }
          setStep(0);
        }
        if (!played && entry.intersectionRatio >= 0.4) {
          played = true;
          play();
        }
      },
      { threshold: [0, 0.4] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [play, stop]);

  return (
    <div
      ref={root}
      className="grid gap-8 px-(--lp-gutter) lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <Window title="~/my-docs" actions={<Replay onClick={play} />}>
        <Terminal step={step} />
      </Window>
      <div className="flex flex-col gap-8">
        <Window title={`${INSTALLED.length} files`}>
          <DitherSwap swapKey={step >= 4 ? 'in' : 'out'} cell={3} duration={3 * TICK}>
            <Files
              className={cn(
                'rounded-none border-0 bg-transparent px-2 py-3 font-mono',
                step < 4 && 'invisible',
              )}
            >
              {renderTree(installed, '')}
            </Files>
          </DitherSwap>
        </Window>
        <Window title={EDIT.file}>
          <Edit edited={step >= DONE} />
        </Window>
      </div>
    </div>
  );
}
