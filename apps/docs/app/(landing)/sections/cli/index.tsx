import type { ReactNode } from 'react';
import { File as FileIcon, RotateCcw } from 'lucide-react';
import pkg from 'fumadocs-ui/package.json';
import { cn } from '@/lib/cn';
import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { Window } from '../../ui/window';
import { EditLines, Imports } from './code';
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
  return cn(
    'absolute lg:col-start-2 lg:row-start-3 lg:row-end-4 xl:col-start-3 xl:row-start-1',
    className,
  );
}

const chip =
  'inline-flex h-7 items-center border border-lp-line-strong bg-lp-paper px-2.5 font-mono text-xs transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink aria-pressed:bg-lp-yellow aria-pressed:text-[#121210]';

/** the split-flap file count on the hopper */
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
        className="relative grid h-7 w-[18px] place-items-center overflow-hidden bg-lp-ink font-pixel text-[22px] leading-none text-lp-sun tabular-nums after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-lp-paper dark:bg-lp-paper-2"
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
        'z-[6] flex items-center gap-2 border border-lp-line-strong bg-lp-paper px-3 py-1',
        className,
      )}
    >
      <span className="flex gap-px">{flaps}</span>
      {/* the plural keeps its width while the count is 1 */}
      <span className="grid font-pixel text-xs text-lp-ink-2 *:col-start-1 *:row-start-1">
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
        hidden={i > 0}
        className="mt-6 lg:col-start-2 lg:row-start-3 lg:mt-(--cli-top) xl:col-start-3 xl:row-span-3 xl:row-start-1"
      >
        <Window data-tree title="my-app">
          <Tree entries={plan.tree} />
        </Window>
      </div>,
    );
    columns.push(
      <div
        key={plan.id}
        data-column={i}
        hidden={i > 0}
        className="mt-6 flex flex-col gap-4 lg:col-start-4 lg:row-start-3 lg:mt-(--cli-top) xl:col-start-5 xl:row-span-3 xl:row-start-1"
      >
        <Imports rewires={plan.rewires} />
        <EditLines edit={plan.edit} />
        <Window data-preview title="localhost:3000/docs">
          <div className="grid *:col-start-1 *:row-start-1">
            <div data-before className="invisible">
              <Preview {...previews[plan.id][0]} />
            </div>
            <div data-after>
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
          'top-[40px] right-[8px] lg:top-[calc(var(--cli-top)_-_48px)] lg:right-auto lg:left-[21px]',
        )}
      />,
    );
    commands.push(
      <span key={plan.id} aria-hidden className="invisible pe-[0.6em]">
        npx @fumadocs/cli {plan.args}
      </span>,
    );
    chips.push(
      <button key={plan.id} type="button" data-play={i} aria-pressed={i === 0} className={chip}>
        {plan.args}
      </button>,
    );
  }

  return (
    <Figure n={8} id="cli" aria-label="CLI" status={plans[0].done}>
      <Stage>
        <FigureHeader
          data-header
          lead={copy.cli.lead}
          title={copy.cli.title}
          description={copy.cli.description}
          className="lg:contents lg:[&>h2]:col-start-1 lg:[&>h2]:row-span-2 lg:[&>h2]:row-start-1 lg:[&>h2]:self-end lg:[&>p]:col-span-3 lg:[&>p]:col-start-2 lg:[&>p]:row-start-1 lg:[&>p]:self-end xl:col-start-1 xl:row-start-1 xl:flex xl:max-w-[340px]"
        />
        <div className="mt-6 flex flex-col gap-3 lg:col-span-3 lg:col-start-2 lg:row-start-2 lg:mt-5 lg:flex-row lg:flex-wrap lg:items-center xl:col-span-1 xl:col-start-1 xl:row-start-2 xl:mt-6 xl:flex-col xl:items-start xl:self-start">
          <div className="flex h-11 w-fit max-w-full items-stretch border border-lp-line-strong bg-lp-paper">
            <code className="flex min-w-0 items-center px-3 font-mono text-sm whitespace-nowrap">
              <span aria-hidden className="me-2 text-lp-ink-2 select-none">
                $
              </span>
              {/* as wide as the longest command, switching commands moves nothing */}
              <span className="grid *:col-start-1 *:row-start-1">
                {commands}
                <span className="flex justify-self-start">
                  <span data-command>npx @fumadocs/cli {plans[0].args}</span>
                  <span
                    data-caret
                    aria-hidden
                    className="lp-caret invisible ms-px h-[1.1em] w-[0.6em] bg-current"
                  />
                </span>
              </span>
            </code>
            <button
              type="button"
              data-replay
              aria-label="Run again"
              className="flex w-11 shrink-0 items-center justify-center border-s border-lp-line-strong transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none motion-reduce:hidden [@media(scripting:none)]:hidden"
            >
              <RotateCcw aria-hidden className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 [@media(scripting:none)]:hidden">{chips}</div>
        </div>
        {/* on a phone the machine has a block of its own above your project; from 1024px its
            parts are placed against the tree's column */}
        <div className="relative mt-6 h-[520px] lg:contents">
          <div
            data-crate
            className={machine(
              'bottom-0 left-0 h-[184px] w-[180px] lg:right-[calc(100%_+_50px)] lg:left-auto lg:h-[190px] lg:w-[220px] xl:bottom-[30px] xl:w-[250px]',
            )}
          >
            <p
              data-label
              className="absolute bottom-[24px] left-[18px] z-[6] flex flex-col gap-1 border border-lp-line-strong bg-lp-paper px-3 py-2 leading-none lg:bottom-[30px] lg:left-[22px] xl:bottom-[34px] xl:left-[24px]"
            >
              <span className="font-mono text-[13px]">fumadocs-ui</span>
              <span className="font-pixel text-sm text-lp-orange">{pkg.version}</span>
            </p>
          </div>
          <p
            data-plate
            className={machine(
              'top-[8px] left-[44px] z-[6] border border-lp-line-strong bg-lp-paper px-3 py-1 font-mono text-[11px] leading-none whitespace-nowrap text-lp-ink-2 lg:top-[calc(var(--cli-top)_-_80px)] lg:right-[calc(100%_+_69px)] lg:left-auto',
            )}
          >
            fumadocs.dev/registry
          </p>
          {counters}
        </div>
        {cells}
        {columns}
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
