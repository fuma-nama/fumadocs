'use client';
import { Fragment, type ReactNode } from 'react';
import { PORT } from '../../lib/cable';
import { nearby } from '../../lib/script';
import { Shadow, Window } from '../../ui/window';
import { type Output, OUTPUTS } from './data';
import { createAutomate } from './engine';

function mount(desk: HTMLDivElement) {
  // the windows' code and buttons are previews, read and selected but not tabbed to
  for (const el of desk.querySelectorAll<HTMLElement>('[role=region], a, button')) el.tabIndex = -1;
  return nearby(desk, () => createAutomate(desk));
}

interface DeskProps {
  id: string;
  /** its place on the desk */
  className: string;
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
function Desk({ id, className, title, badge, ports, children }: DeskProps) {
  return (
    <div data-window={id} className={`relative max-md:w-[calc(100%-24px)] ${className}`}>
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

/**
 * The desk's columns from 1024px, each stacked on its own, and each window's place: from 768px two
 * columns of three, the rows snaking left to right, right to left, left to right, the right column
 * a step lower; below, one column in the thread's order, the windows inset by turns on the left and
 * the right, a gap a clip's run long between them. From 1024px each window's left edge and width
 * are shares of the desk, the first row's tops and the gaps over the second as at 1440px, scaled
 * with the desk but never under 0.8 of that (vertical margins in % are shares of the width). The
 * cables under them are routed from their boxes, so they follow any of these.
 */
const STACKS: readonly (readonly { id: 'source' | Output; className: string }[])[] = [
  [
    {
      id: 'source',
      // its new line: a + in its gutter
      className:
        "max-md:order-1 md:max-lg:col-start-1 md:max-lg:row-start-1 lg:mt-[max(35.2px,3.298%)] lg:w-[32%] **:data-mark:before:absolute **:data-mark:before:left-0.75 **:data-mark:before:content-['+']",
    },
    {
      id: 'releases',
      className:
        'max-md:order-6 max-md:self-end md:max-lg:col-start-2 md:max-lg:row-start-3 md:max-lg:mt-8 lg:mt-[max(80px,7.496%)] lg:ml-[1.6%] lg:w-[28.5%]',
    },
  ],
  [
    {
      id: 'props',
      // a prop's row framed inside its item's round corners
      className:
        'max-md:order-2 max-md:self-end md:max-lg:col-start-2 md:max-lg:row-start-1 md:max-lg:mt-8 lg:ml-[34.5%] lg:w-[34%] **:data-frame:rounded-[11px]',
    },
    {
      id: 'llms',
      className:
        'max-md:order-5 md:max-lg:col-start-1 md:max-lg:row-start-3 lg:mt-[max(63.2px,5.922%)] lg:ml-[32.7%] lg:w-[29%]',
    },
  ],
  [
    {
      id: 'page',
      // below 1024 its code is its excerpt round the edit; before the edit its line's room is kept
      // under the rest, as button.tsx keeps it
      className:
        'max-md:order-3 md:max-lg:col-start-2 md:max-lg:row-start-2 md:max-lg:mt-8 lg:mt-[max(22.4px,2.099%)] lg:ml-[71%] lg:w-[29%] max-lg:[&_.line:not([data-excerpt])]:hidden max-lg:[&_code]:min-h-[3lh]',
    },
    {
      id: 'og',
      className:
        'max-md:order-4 max-md:self-end md:max-lg:col-start-1 md:max-lg:row-start-2 lg:mt-[max(41.6px,3.898%)] lg:ml-[67%] lg:w-[31%]',
    },
  ],
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
      className="invisible absolute top-1.75 right-1.75 bg-lp-yellow px-1 font-pixel text-pixel text-lp-on-yellow antialiased"
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
    for (const { id, className } of ids) {
      windows.push(
        <Desk
          key={id}
          id={id}
          className={className}
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
                className="border-t border-lp-line px-3 py-1 font-pixel text-pixel text-lp-ink-2 antialiased"
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
      <div
        key={ids[0].id}
        className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:items-start"
      >
        {windows}
      </div>,
    );
  }

  return (
    <div className="px-(--lp-gutter) pb-(--lp-section)">
      {/* what the edit changed, over a solid yellow flash framed as the CLI frames a change, its text
      in the highlight's ink over the code's own colours, with none of its own transitions */}
      <div
        ref={mount}
        className="relative flex flex-col gap-y-14 pb-5 md:grid md:max-lg:grid-cols-2 md:max-lg:items-start md:max-lg:gap-x-[max(4%,40px)] **:data-mark:relative **:data-mark:isolate **:data-mark:transition-none **:data-mark:**:transition-none **:data-[mark=on]:text-lp-on-yellow! **:data-[mark=on]:**:text-lp-on-yellow!"
      >
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
