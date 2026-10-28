'use client';
import { type FocusEvent, type PointerEvent, type ReactNode, useState } from 'react';
import Link from 'next/link';
import { Check, Clipboard } from 'lucide-react';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { restore, setStatus } from '../../lib/status';
import { Roller } from '../../ui/text';
import { Window } from '../../ui/window';
import type { Module } from './data';

/**
 * The board of modules, every card playing its mechanism. The install window shows the command of the
 * card last pointed at or focused.
 */
export function Board({
  header,
  modules,
  mechanisms,
  children,
}: {
  header: ReactNode;
  modules: Module[];
  /** each module's `<Stage>` by its title */
  mechanisms: Record<string, ReactNode>;
  /** the row under the board */
  children: ReactNode;
}) {
  const [inspected, setInspected] = useState(0);
  const search = useSearchContext();

  function enter(i: number) {
    setInspected(i);
    setStatus(`inspecting ${modules[i].pkg}`);
  }

  const commands: string[] = [];
  const cells = [];
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    commands.push(module.install);
    const props = {
      className:
        'bt-cell group relative flex flex-col border-e border-b border-lp-line p-(--lp-gutter) text-start text-lp-ink transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none',
      // a mouse points at a card; a tap opens it
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType === 'mouse') enter(i);
      },
      onPointerLeave: (event: PointerEvent) => {
        if (event.pointerType === 'mouse') restore();
      },
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(':focus-visible')) enter(i);
      },
      onBlur: restore,
    };
    const content = (
      <>
        {/* as wide as the mechanism, so the hotkeys end on its right edge */}
        <span className="flex max-w-(--bt-stage) items-start justify-between gap-4">
          <span className="-ms-0.75 px-0.75 text-[28px] leading-none tracking-[-0.02em] group-hover:bg-lp-yellow group-hover:text-lp-on-yellow group-focus-visible:bg-lp-yellow group-focus-visible:text-lp-on-yellow">
            {module.title}
          </span>
          {!module.href && (
            <span className="flex gap-1 text-xs max-md:hidden">
              {search.hotKey.map((key, k) => (
                <kbd key={k} className="border border-current px-1.5 leading-5">
                  {key.display}
                </kbd>
              ))}
            </span>
          )}
        </span>
        {/* the command takes the package's place where the install window is hidden */}
        <span className="mt-1.5 font-mono text-xs text-lp-ink-2 group-hover:text-lp-paper/60 group-focus-visible:text-lp-paper/60">
          <span className="lg:hidden">
            <span aria-hidden className="select-none">
              ${' '}
            </span>
            {module.install}
          </span>
          <span className="max-lg:hidden">{module.pkg}</span>
        </span>
        <span className="mt-4 block">{mechanisms[module.title]}</span>
        <span className="mt-auto pt-4 text-sm leading-snug text-pretty text-lp-ink-2 group-hover:text-lp-paper/60 group-focus-visible:text-lp-paper/60">
          {module.line}
        </span>
      </>
    );
    cells.push(
      module.href ? (
        <Link key={module.title} href={module.href} prefetch={false} {...props}>
          {content}
        </Link>
      ) : (
        <button
          key={module.title}
          type="button"
          onClick={() => search.setOpenSearch(true)}
          {...props}
        >
          {content}
        </button>
      ),
    );
  }

  return (
    <div ref={playOnScreen} className="flex flex-col overflow-x-clip">
      <div className="flex flex-col gap-10 p-(--lp-gutter) pt-16 pb-12 lg:flex-row lg:items-end lg:justify-between">
        {header}
        <Install commands={commands} command={modules[inspected].install} />
      </div>
      {/* a pixel wider than the figure: the last column's end line falls outside, clipped */}
      <div className="-me-px grid border-t border-lp-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cells}
      </div>
      {children}
    </div>
  );
}

/**
 * A row marked `data-keyed` while one of its links has focus from the keyboard, the link scrolled
 * fully into view once the mark has stopped the row
 */
export function Keyed({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      onFocus={(event) => {
        const keyed = event.target.matches(':focus-visible');
        event.currentTarget.toggleAttribute('data-keyed', keyed);
        if (keyed) event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.removeAttribute('data-keyed');
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/** a card plays its mechanism, and the row under the board rolls, only while it is on screen */
function playOnScreen(board: HTMLDivElement) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.toggleAttribute('data-paused', !entry.isIntersecting);
  });
  for (const el of board.querySelectorAll('.bt-cell, .bt-more')) observer.observe(el);
  return () => observer.disconnect();
}

function Install({ commands, command }: { commands: string[]; command: string }) {
  const [copied, onCopy] = useCopyButton(() => navigator.clipboard.writeText(command));
  // as wide as the longest command, so the window keeps its size as the command changes
  const sizers = [];
  for (const item of commands) {
    sizers.push(
      <span key={item} aria-hidden className="invisible col-start-1 row-start-1">
        {item}
      </span>,
    );
  }

  return (
    // below 1024 each cell shows its own command: the window would sit screens above most cells
    <Window title={<span className="font-pixel">install</span>} className="shrink-0 max-lg:hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm">
        <span aria-hidden className="text-lp-ink-2">
          $
        </span>
        <span className="grid min-w-0 flex-1 whitespace-pre">
          {sizers}
          <Roller value={command} step={24} stagger={6} className="col-start-1 row-start-1" />
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? 'Copied' : `Copy "${command}"`}
          className="flex size-6 shrink-0 items-center justify-center border border-lp-line-strong hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
        </button>
      </div>
    </Window>
  );
}
