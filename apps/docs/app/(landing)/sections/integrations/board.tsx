'use client';
import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { Check, Clipboard } from 'lucide-react';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { mount, reduce } from '../../lib/script';
import { restore, setStatus } from '../../lib/status';
import { Roller } from '../../ui/text';
import { Window } from '../../ui/window';
import type { Module } from './data';
import { createEntrance } from './engine';

/**
 * The board of modules, each card's mechanism played once as the card comes in and again as it's
 * pointed at or focused, else resting on its payoff. The install window shows the command of the
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

  function enter(card: HTMLElement, i: number) {
    setInspected(i);
    setStatus(`inspecting ${modules[i].pkg}`);
    // its mechanism once more, unless it's still playing or yet to come in; a card queued for its
    // turn leaves the queue
    if (card.hasAttribute('data-play') || card.hasAttribute('data-waiting') || reduce()) return;
    delete card.dataset.queued;
    card.dataset.play = 'fast';
  }

  const title =
    '-ms-0.75 px-0.75 text-[28px] leading-none tracking-[-0.02em] group-hover:bg-lp-yellow group-hover:text-lp-on-yellow group-data-focus:bg-lp-yellow group-data-focus:text-lp-on-yellow focus-visible:outline-none';
  const commands: string[] = [];
  const cells = [];
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    commands.push(module.install);
    cells.push(
      // the title is the card's control, the rest of its text selectable; a click anywhere else on
      // it, but the end of a selection, is a click on the title
      <div
        key={module.title}
        onClick={(event) => {
          if ((event.target as Element).closest('a, button') || !getSelection()?.isCollapsed)
            return;
          event.currentTarget.querySelector<HTMLElement>('a, button')?.click();
        }}
        // a mouse points at a card; a tap opens it
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') enter(event.currentTarget, i);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') restore();
        }}
        onFocus={(event) => {
          if (!event.target.matches(':focus-visible')) return;
          event.currentTarget.toggleAttribute('data-focus', true);
          enter(event.currentTarget, i);
        }}
        onBlur={(event) => {
          event.currentTarget.removeAttribute('data-focus');
          restore();
        }}
        // played through: it rests on its payoff, its animations gone
        onAnimationEnd={(event) => {
          const card = event.currentTarget;
          for (const animation of card.getAnimations({ subtree: true }))
            if (
              animation instanceof CSSAnimation &&
              animation.animationName.startsWith('bt-') &&
              animation.playState !== 'finished'
            )
              return;
          delete card.dataset.play;
        }}
        className="bt-cell group relative flex cursor-pointer flex-col border-e border-b border-lp-line bg-lp-paper p-(--lp-gutter) text-lp-ink data-waiting:pointer-events-none data-waiting:opacity-0 hover:bg-lp-ink hover:text-lp-paper data-focus:bg-lp-ink data-focus:text-lp-paper md:p-6 xl:p-8"
      >
        {/* as wide as the mechanism, so the hotkeys end on its right edge */}
        <div className="flex max-w-(--bt-stage) items-start justify-between gap-4">
          {module.href ? (
            <Link href={module.href} prefetch={false} className={title}>
              {module.title}
            </Link>
          ) : (
            <button type="button" onClick={() => search.setOpenSearch(true)} className={title}>
              {module.title}
            </button>
          )}
          {!module.href && (
            <span className="flex gap-1 text-xs max-md:hidden">
              {search.hotKey.map((key, k) => (
                <kbd key={k} className="border border-current px-1.5 leading-5">
                  {key.display}
                </kbd>
              ))}
            </span>
          )}
        </div>
        {/* what it does, read with its name */}
        <p className="mt-2 text-sm leading-snug text-pretty text-lp-ink-2 group-hover:text-lp-paper/60 group-data-focus:text-lp-paper/60">
          {module.line}
        </p>
        <div className="mt-8">{mechanisms[module.title]}</div>
      </div>,
    );
  }

  // a cable from each card to the next: each its own svg round it, drawn once and wiped in by its
  // clip, so its growth repaints nothing
  const wires = [];
  for (let i = 1; i < modules.length; i++)
    wires.push(<span key={i} data-wire className="absolute" />);

  return (
    <div ref={playOnScreen} className="flex flex-col overflow-x-clip">
      <div className="flex flex-col gap-10 px-(--lp-gutter) pt-(--lp-section) pb-10 md:pb-12 lg:flex-row lg:items-end lg:justify-between">
        {header}
        <Install commands={commands} command={modules[inspected].install} />
      </div>
      {/* a pixel wider than the figure: the last column's end line falls outside, clipped */}
      <div
        ref={entrance}
        className="group/board relative -me-px grid border-t border-lp-line data-[state]:pointer-events-none md:grid-cols-2 xl:grid-cols-3"
      >
        {/* the cables the cards pop along as the board comes in, under them */}
        <div
          aria-hidden
          className="pointer-events-none invisible absolute inset-0 group-data-[state=playing]/board:visible"
        >
          {wires}
        </div>
        {cells}
      </div>
      {children}
    </div>
  );
}

/** the board's entrance, made a screen before the reader reaches it */
const entrance = mount(createEntrance);

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

/** a card plays its mechanism only while it is on screen */
function playOnScreen(board: HTMLDivElement) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.toggleAttribute('data-paused', !entry.isIntersecting);
  });
  for (const el of board.querySelectorAll('.bt-cell')) observer.observe(el);
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
    <Window
      title={<span className="font-pixel text-[13.16px] antialiased">install</span>}
      className="shrink-0 max-lg:hidden"
    >
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
