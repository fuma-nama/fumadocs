'use client';
import { Fragment, type ReactNode } from 'react';
import { PORT } from '../../lib/cable';
import { nearby } from '../../lib/script';
import { Shadow, Window } from '../../ui/window';
import { type Output, OUTPUTS } from './data';
import { createAutomate } from './engine';
import './automate.css';

function mount(desk: HTMLDivElement) {
  // the windows' code and buttons are previews, read and selected but not tabbed to
  for (const el of desk.querySelectorAll<HTMLElement>('[role=region], a, button')) el.tabIndex = -1;
  return nearby(desk, () => createAutomate(desk));
}

interface DeskProps {
  id: string;
  title: ReactNode;
  /** over the title bar: an output's `updated` chip, the source's modified dot */
  badge: ReactNode;
  /** its ports, where the cables meet its frame: in from the one before, out to the next */
  ports: ('in' | 'out')[];
  children: ReactNode;
}

/**
 * A window on the desk: its box placed by the layout, and inside it what pops, the window over its
 * shadow, with the ports on its frame that the cables ask for
 */
function Desk({ id, title, badge, ports, children }: DeskProps) {
  return (
    <div data-window={id} className={`am-window am-${id}`}>
      <div data-pop="" className="invisible relative isolate">
        <Shadow />
        <Window title={title} className="overflow-hidden">
          <div className="grid *:col-start-1 *:row-start-1">{children}</div>
        </Window>
        {badge}
        {ports.map((way) => (
          <span key={way} data-port={way} aria-hidden className={PORT}>
            {/* its pin lit by the change going through, over the ink one */}
            <span className="invisible absolute inset-0.75 z-1 bg-lp-yellow" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** an output as the source made it before the edit, and after */
export interface Made {
  before: ReactNode;
  after: ReactNode;
}

interface StageProps {
  file: string;
  /** the source, highlighted, its edit's line in it */
  source: ReactNode;
  outputs: Record<Output, Made>;
}

/** the desk's columns from 1024px, each a window over another */
const STACKS: readonly (readonly ('source' | Output)[])[] = [
  ['source', 'releases'],
  ['props', 'llms'],
  ['page', 'og'],
];

/**
 * The desk under the title: a cable runs out of the source's window into each output in turn, each
 * output popping as it's reached, and the edit rides them down to every one as a bead, the cable
 * filling behind it. The cables lie under every window.
 */
export function Stage({ file, source, outputs }: StageProps) {
  const titles = new Map<string, ReactNode>([['source', file]]);
  for (const output of OUTPUTS) titles.set(output.id, output.title);
  // over the title bar's box on the right, the action slot
  const chip = (
    <span
      data-chip=""
      className="invisible absolute top-1.75 right-1.75 bg-lp-yellow px-1 font-pixel text-[13.16px] leading-4 text-lp-on-yellow antialiased"
    >
      updated
    </span>
  );
  // the editor's modified dot just right of the title, which keeps its place: the title's mono cells
  // and its padding put that edge half its width from the middle
  const dot = (
    <span
      data-modified=""
      aria-hidden
      className="invisible absolute top-px flex h-6.75 items-center bg-lp-paper pr-2 font-mono text-xs leading-4"
      style={{ left: `calc(50% + ${file.length / 2}ch + 8px)` }}
    >
      ●
    </span>
  );
  const stacks: ReactNode[] = [];
  for (const ids of STACKS) {
    const windows: ReactNode[] = [];
    for (const id of ids) {
      windows.push(
        <Desk
          key={id}
          id={id}
          title={titles.get(id)}
          badge={id === 'source' ? dot : chip}
          ports={id === 'source' ? ['out'] : id === 'releases' ? ['in'] : ['in', 'out']}
        >
          {id === 'source' ? (
            <div className="flex flex-col">
              {/* the edit's line kept from the start, so the window never grows */}
              <div
                data-code=""
                className="contain-layout contain-paint [&_.line]:min-h-lh [&_code]:min-h-[10lh]"
              >
                {source}
              </div>
              {/* the editor's status line */}
              <p
                data-footer=""
                className="border-t border-lp-line px-3 py-1 font-pixel text-[13.16px] leading-4 text-lp-ink-2 antialiased"
              >
                {file}
              </p>
            </div>
          ) : (
            <>
              <div data-before="" className="bg-lp-paper">
                {outputs[id].before}
              </div>
              <div data-after="" className="invisible bg-lp-paper">
                {outputs[id].after}
              </div>
            </>
          )}
        </Desk>,
      );
    }
    stacks.push(
      <div key={ids[0]} className="am-stack">
        {windows}
      </div>,
    );
  }

  return (
    <div className="px-(--lp-gutter) pb-(--lp-section)">
      <div ref={mount} className="am-desk">
        {/* under every window: a cable into each output, drawn as it's routed, the same cable with
        its core lit, the bead and the pops' dots */}
        <div data-wires="" aria-hidden className="pointer-events-none absolute inset-0">
          {OUTPUTS.map((output) => (
            <Fragment key={output.id}>
              <span data-cable="" className="invisible absolute" />
              <span data-lit="" className="invisible absolute" />
            </Fragment>
          ))}
          <span
            data-bead=""
            className="absolute top-0 left-0 size-2 border border-lp-ink bg-lp-yellow opacity-0"
          />
        </div>
        {stacks}
        <p data-said="" aria-live="polite" className="sr-only" />
      </div>
    </div>
  );
}
