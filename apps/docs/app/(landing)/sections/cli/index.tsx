import type { CSSProperties, ReactNode } from 'react';
import { File as FileIcon, RotateCcw } from 'lucide-react';
import pkg from 'fumadocs-ui/package.json';
import { cn } from '@/lib/cn';
import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { Window } from '../../ui/window';
import { Editor } from './code';
import { deliveries, type Plan, plans } from './data';
import { Preview, type PreviewProps } from './preview';
import { Stage } from './stage';
import { Tree } from './tree';

/** the page before and after each plan's edit: the classes your copy of the component adds */
const previews: Record<Plan['id'], [PreviewProps, PreviewProps]> = {
  customize: [{}, { title: 'text-[2.5em]' }],
  add: [{ banner: '' }, { banner: 'bg-fd-primary text-fd-primary-foreground' }],
};

/** a part of the machine: in its block on a phone, against the tree's column from 1024px */
function machine(className: string) {
  return cn('absolute lg:col-start-2 lg:row-start-1 lg:row-end-2', className);
}

const chip =
  'inline-flex h-7 items-center justify-center border border-lp-line-strong bg-lp-paper px-2.5 font-mono text-xs transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink aria-pressed:bg-lp-yellow aria-pressed:text-[#121210]';

/** the split-flap file count on the hopper, smaller on a phone's narrow one */
function Counter({
  scene,
  count,
  className,
}: {
  scene: number;
  count: number;
  className?: string;
}) {
  const flaps: ReactNode[] = [];
  const digits = String(count);
  for (let i = 0; i < digits.length; i++) {
    flaps.push(
      <span
        key={i}
        data-flap
        className="relative grid h-6 w-[15px] place-items-center overflow-hidden bg-lp-ink font-pixel text-[18px] leading-none text-lp-sun tabular-nums after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-lp-paper md:h-7 md:w-[18px] md:text-[22px] dark:bg-lp-paper-2"
      >
        {digits[i]}
      </span>,
    );
  }
  return (
    <p
      data-counter
      data-scene={scene}
      hidden={scene > 0}
      className={cn(
        'z-[6] flex items-center gap-1.5 border border-lp-line-strong bg-lp-paper px-3 py-1 md:gap-2',
        className,
      )}
    >
      <span className="flex gap-px">{flaps}</span>
      {/* the plural keeps its width while the count is 1 */}
      <span className="grid font-pixel text-[11px] text-lp-ink-2 *:col-start-1 *:row-start-1 md:text-xs">
        <span aria-hidden className="invisible">
          files
        </span>
        <span data-noun>{count === 1 ? 'file' : 'files'}</span>
      </span>
    </p>
  );
}

export function Cli() {
  const cells: ReactNode[] = [];
  const columns: ReactNode[] = [];
  const counters: ReactNode[] = [];
  const cards: ReactNode[] = [];
  const chips: ReactNode[] = [];
  const commands: ReactNode[] = [];
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    for (const delivery of deliveries(plan)) {
      cards.push(
        <div
          key={`${plan.id}:${delivery.path}`}
          data-card={delivery.inlet}
          data-scene={i}
          data-reveals={delivery.reveals.join(' ')}
          className="invisible absolute top-0 left-0 flex h-6 origin-top-left items-center gap-1.5 border border-lp-line-strong bg-lp-paper px-2 font-mono text-xs whitespace-nowrap"
        >
          <FileIcon className="size-3.5 text-lp-ink-2" />
          {delivery.name}
        </div>,
      );
    }
    cells.push(
      <div
        key={plan.id}
        data-tree-cell={i}
        data-args={plan.args}
        data-done={plan.done}
        data-fetch={plan.fetch}
        data-edit-name={plan.edit.name}
        inert={i > 0}
        className="col-start-1 row-start-2 mt-4 inert:invisible md:col-start-2 md:mt-6 lg:row-start-1 lg:mt-(--cli-top)"
      >
        {/* a phone's window is short, a row cut in half at its foot: the list reads as one that scrolls */}
        <Window data-tree title="my-app" className="h-[266px] md:h-full">
          <Tree entries={plan.tree} />
        </Window>
      </div>,
    );
    // its editor and its page each share their cell with the other run's: switching keeps them
    columns.push(
      <div key={plan.id} data-column={i} inert={i > 0} className="contents inert:invisible">
        <Editor
          id={`cli-${plan.id}`}
          sources={plan.sources}
          rewires={plan.rewires}
          edit={plan.edit}
          className="col-start-1 row-start-1"
        />
        <Window
          data-preview
          title="localhost:3000/docs"
          className="col-start-1 row-start-2 min-h-0 overflow-hidden"
        >
          {/* the page before your edit and after it, in one place; `data-edited` says which shows.
              Only ever hidden, never forced visible, so an inactive run's page stays unseen. A
              short screen's window shows the top of the page, cut off like a browser's */}
          <div
            data-page
            data-edited
            className="group grid min-h-0 flex-1 *:col-start-1 *:row-start-1"
          >
            <div className="group-data-edited:invisible">
              <Preview {...previews[plan.id][0]} />
            </div>
            <div data-after className="group-[:not([data-edited])]:invisible">
              <Preview {...previews[plan.id][1]} />
            </div>
          </div>
        </Window>
      </div>,
    );
    counters.push(
      <Counter
        key={plan.id}
        scene={i}
        count={plan.files.length}
        className={machine(
          'right-4 -bottom-1.5 md:right-[130px] md:-bottom-3.5 md:translate-x-1/2 lg:top-[calc(var(--cli-top)_-_48px)] lg:right-auto lg:bottom-auto lg:left-[21px] lg:translate-x-0',
        )}
      />,
    );
    // a character per span: typing shows them in place, so the command never reflows
    const text = `npx @fumadocs/cli ${plan.args}`;
    const characters: ReactNode[] = [];
    for (let n = 0; n < text.length; n++) {
      characters.push(
        <span key={n} style={{ '--i': n } as CSSProperties}>
          {text[n]}
        </span>,
      );
    }
    commands.push(
      <code
        key={plan.id}
        data-command={i}
        inert={i > 0}
        className="col-start-1 row-start-1 block inert:invisible *:[opacity:clamp(0,calc(var(--typed,999)_-_var(--i)),1)]"
      >
        {characters}
      </code>,
    );
    chips.push(
      <button key={plan.id} type="button" data-play={i} aria-pressed={i === 0} className={chip}>
        {plan.label}
      </button>,
    );
  }

  return (
    <Figure n={8} id="cli" aria-label="CLI" status={plans[0].done}>
      {/* the section's text and the runs to pick; the stage under them plays the one picked */}
      <div className="flex flex-col gap-8 px-(--lp-gutter) pt-16 pb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <FigureHeader
          data-header
          lead={copy.cli.lead}
          title={copy.cli.title}
          description={copy.cli.description}
        />
        {/* the runs and the command share both edges: the stage's width on a phone and a tablet,
            the command's from 1024px, against the stage's right edge */}
        <div className="flex flex-col gap-3 lg:shrink-0">
          <div className="grid grid-cols-2 gap-2 [@media(scripting:none)]:hidden">{chips}</div>
          <div className="flex max-w-full items-stretch border border-lp-line-strong bg-lp-paper">
            <div className="flex min-w-0 flex-1 gap-2 px-3 py-[11px] font-mono text-[13px] leading-5 sm:text-sm">
              <span aria-hidden className="text-lp-ink-2 select-none">
                $
              </span>
              {/* both commands in one place: the box keeps the size of the longer one */}
              <span className="relative grid min-w-0">
                {commands}
                <span
                  data-caret
                  aria-hidden
                  className="lp-caret invisible absolute top-0 left-0 h-[1.1em] w-[0.6em] bg-current"
                />
              </span>
            </div>
            <button
              type="button"
              data-replay
              aria-label="Run again"
              className="flex w-11 shrink-0 items-center justify-center border-s border-lp-line-strong transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none motion-reduce:hidden [@media(scripting:none)]:hidden"
            >
              <RotateCcw aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <Stage>
        {/* on a phone and a tablet the machine has a block of its own above your project: the
            drive unit and its beam on top, the crate and the hopper under it; from 1024px it
            stands left of your project, its riser climbing to the hopper */}
        <div className="relative col-start-1 row-start-1 h-[360px] md:col-span-2 lg:contents">
          <div
            data-crate
            className={machine(
              'bottom-0 left-0.5 h-[160px] w-[min(180px,calc(50%-8px))] lg:right-[calc(100%_+_40px)] lg:left-auto lg:h-[180px] lg:w-[188px] xl:h-[190px] xl:w-[218px]',
            )}
          >
            <p
              data-label
              className="absolute bottom-4 left-4 z-[6] flex flex-col gap-1 border border-lp-line-strong bg-lp-paper px-3 py-2 leading-none lg:bottom-[38px] lg:py-1 xl:bottom-[36px] xl:left-[22px] xl:py-1.5"
            >
              <span className="font-mono text-[13px] lg:text-[10px] xl:text-[13px]">
                fumadocs-ui
              </span>
              <span className="font-pixel text-sm text-lp-orange lg:text-[11px] xl:text-sm">
                {pkg.version}
              </span>
            </p>
          </div>
          <p
            data-plate
            className={machine(
              'top-2 left-2 z-[6] border border-lp-line-strong bg-lp-paper px-3 py-1 font-mono text-[11px] leading-none whitespace-nowrap text-lp-ink-2 lg:top-[calc(var(--cli-top)_-_80px)] lg:right-[calc(100%_+_69px)] lg:left-auto lg:text-[10px] xl:text-[11px]',
            )}
          >
            fumadocs.dev/registry
          </p>
          {counters}
        </div>
        {cells}
        <div className="col-start-1 row-start-3 mt-4 grid min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-4 md:row-start-2 md:mt-6 md:gap-6 lg:col-start-4 lg:row-start-1 lg:mt-0">
          {columns}
        </div>
        <div data-cards aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
          {cards}
        </div>
        <span
          data-edit-caret
          aria-hidden
          className="lp-caret pointer-events-none invisible absolute top-0 left-0 z-[7] bg-lp-ink"
        />
      </Stage>
    </Figure>
  );
}
