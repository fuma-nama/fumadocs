'use client';
import { Search } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { type Layer, LAYER_ICONS } from '../../ui/chip';
import { mount } from '../../lib/script';
import { Shadow, Window } from '../../ui/window';
import { PORT } from '../../lib/cable';
import { CORE, LAYERS, NAMES, OPTIONS, ROLES } from './data';
import { createParts } from './engine';
import { CARD, GAP, RACK, ROOM, type View, VIEWS } from './scene';

const play = mount(createParts);

/** taller than the view where the rack opens wider than RACK for a page to fit with ROOM */
function height(view: View): string {
  const share = (units: number) => `${((units / (view.right - view.left)) * 100).toFixed(4)}%`;
  const tall = view.top - view.bottom;
  return `max(${share(tall)}, calc(${share(tall - RACK - GAP)} + ${CARD[1] + ROOM}px))`;
}

const heights = { '--wide': height(VIEWS.wide), '--phone': height(VIEWS.phone) } as CSSProperties;

function Plates() {
  const plates: ReactNode[] = [];
  for (const layer of LAYERS) {
    const core = layer === 'core';
    const title = core ? CORE.title : OPTIONS[layer][0].title;
    plates.push(
      <div
        key={layer}
        data-plate={layer}
        {...(core
          ? {}
          : { role: 'button', tabIndex: 0, 'aria-label': `${NAMES[layer]}: ${title}` })}
        style={{ transform: 'scale(0)' }}
        className={cn(
          'pointer-events-auto absolute top-0 left-0 flex h-(--parts-plate-h) w-(--parts-plate-w) origin-top-left border font-pixel text-[13.16px] leading-4 antialiased select-text',
          core
            ? 'border-lp-paper bg-lp-ink text-lp-paper dark:border-lp-ink dark:bg-lp-paper dark:text-lp-ink'
            : 'border-lp-ink bg-lp-paper text-lp-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-orange data-ready:cursor-pointer data-ready:hover:bg-lp-yellow data-ready:hover:text-lp-on-yellow dark:border-lp-paper dark:bg-lp-ink dark:text-lp-paper',
        )}
      >
        <span
          data-badge
          aria-hidden
          className={cn(
            'aspect-square h-full shrink-0',
            core ? 'bg-lp-sun dark:bg-lp-orange' : 'bg-lp-ink dark:bg-lp-paper',
          )}
        >
          <svg
            viewBox="0 0 8 8"
            shapeRendering="crispEdges"
            className={cn(
              'm-(--parts-icon-at) size-(--parts-icon)',
              core ? 'fill-lp-ink dark:fill-lp-paper' : 'fill-lp-sun dark:fill-lp-orange',
            )}
          >
            <path d={LAYER_ICONS[layer]} />
          </svg>
        </span>
        <span className="flex min-w-0 flex-col ps-(--parts-pad) pt-(--parts-text-at)">
          <span data-role className="opacity-70">
            {NAMES[layer]}
          </span>
          <span data-name className="mt-(--parts-name-at) whitespace-nowrap">
            {title}
          </span>
        </span>
      </div>,
    );
  }
  return plates;
}

function Displays() {
  const display =
    'pointer-events-auto absolute top-0 left-0 overflow-hidden px-1 font-pixel text-[13.16px] leading-4 whitespace-pre text-lp-paper antialiased select-text dark:text-lp-ink';
  return (
    <>
      <div data-display="framework" style={{ transform: 'scale(0)' }} className={display}>
        <span data-line className="block" />
        <span data-line className="block">
          serving <span className="text-lp-sun dark:text-lp-orange">/docs</span>
        </span>
      </div>
      <div data-display="core" style={{ transform: 'scale(0)' }} className={display}>
        <span data-search className="flex items-center gap-[0.3em]">
          <Search aria-hidden className="size-3 shrink-0" />
          <span>
            <span data-query />_
          </span>
        </span>
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            data-line
            className="block w-fit px-0.5 data-hit:bg-lp-sun data-hit:text-lp-ink dark:data-hit:bg-lp-orange"
          />
        ))}
      </div>
    </>
  );
}

/** the UI's page on its screen, drawn by the engine in steps: its frame, its tree and text, its TOC
 * and accent; a plain page has no frame or accent, and its tree is links */
function Screen() {
  return (
    <div
      data-display="ui"
      style={{ transform: 'scale(0)' }}
      className="group/page pointer-events-auto absolute top-0 left-0 flex origin-top-left overflow-hidden font-semibold text-lp-ink select-text dark:text-lp-paper"
    >
      <ul
        data-side
        className="invisible shrink-0 border-r border-current px-2 pt-2 text-[11px] leading-4 group-data-frame/page:visible group-data-[look=plain]/page:border-transparent"
      >
        {[0, 1, 2].map((n) => (
          <li
            key={n}
            data-line
            className="invisible -mx-1 px-1 whitespace-nowrap group-data-text/page:visible group-data-[look=plain]/page:underline group-data-[look=plain]/page:decoration-1 group-data-[look=plain]/page:underline-offset-2 group-data-[look=plain]/page:group-data-frame/page:visible data-hit:bg-lp-sun data-hit:text-lp-paper dark:data-hit:bg-lp-orange dark:data-hit:text-lp-ink"
          />
        ))}
      </ul>
      <div className="invisible min-w-0 flex-1 px-2 pt-2 group-data-text/page:visible">
        <p
          data-title
          className="truncate text-base leading-5 group-data-[look=edited]/page:group-data-done/page:text-lp-sun dark:group-data-[look=edited]/page:group-data-done/page:text-lp-orange"
        />
        {[90, 75, 55].map((share) => (
          <span
            key={share}
            style={{ width: `${share}%` }}
            className="mt-1.5 block h-0.5 bg-current"
          />
        ))}
      </div>
      <ul
        data-toc
        className="invisible my-2 shrink-0 border-l border-current px-2 text-[11px] leading-4 group-data-frame/page:visible group-data-[look=plain]/page:border-transparent"
      >
        {['On this page', 'Usage', 'Options'].map((line) => (
          <li key={line} className="invisible group-data-done/page:visible">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pages() {
  return [0, 1, 2].map((n) => (
    <div
      key={n}
      data-page={n}
      style={{ transform: 'scale(0)' }}
      className="group/page pointer-events-auto absolute top-0 left-0 h-30 w-24 select-text"
    >
      <div className="flex size-full flex-col gap-2 border border-lp-ink bg-lp-paper p-2 text-lp-ink group-data-handed/page:invisible group-data-[look=files]/page:[clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,0_100%)] dark:border-lp-paper dark:bg-lp-ink dark:text-lp-paper">
        <span className="hidden size-3 bg-lp-sun group-data-[look=blocks]/page:block dark:bg-lp-orange" />
        <span
          data-name
          className="truncate text-[13px] leading-4 font-medium [mask-size:8px_8px] group-data-handed/page:visible group-data-[look=files]/page:font-pixel group-data-[look=files]/page:text-[13.16px] group-data-[look=files]/page:font-normal group-data-[look=files]/page:antialiased"
        />
        <span className="h-px w-full bg-current" />
        <span className="h-px w-5/6 bg-current" />
      </div>
      <span className="absolute top-0 right-0 hidden size-3.5 bg-lp-ink-2 [clip-path:polygon(0_0,0_100%,100%_100%)] group-data-handed/page:invisible group-data-[look=files]/page:block" />
    </div>
  ));
}

/** a module's cable to its row, drawn by the engine, and its port on the module's face edge */
function Leader({ layer }: { layer: Layer }) {
  return (
    <>
      <span
        data-leader={layer}
        data-state="off"
        aria-hidden
        className="pointer-events-none absolute hidden data-[state=off]:invisible lg:block"
      />
      <span
        data-port={layer}
        data-state="off"
        aria-hidden
        className={cn(PORT, 'hidden data-[state=off]:invisible lg:block')}
      />
    </>
  );
}

function Panel({ className }: { className: string }) {
  const rows: ReactNode[] = [];
  for (const layer of LAYERS) {
    const chips: ReactNode[] = [];
    if (layer !== 'core') {
      for (const [k, option] of OPTIONS[layer].entries()) {
        chips.push(
          <button
            key={option.title}
            type="button"
            role="radio"
            data-chip={k}
            aria-checked={k === 0}
            tabIndex={k === 0 ? 0 : -1}
            disabled
            className="border border-lp-line-strong px-1.5 py-1 font-pixel text-[13.16px] leading-4 text-lp-ink antialiased focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-orange enabled:cursor-pointer aria-checked:bg-lp-ink aria-checked:text-lp-paper enabled:not-aria-checked:hover:bg-lp-yellow enabled:not-aria-checked:hover:text-lp-on-yellow"
          >
            {option.title}
          </button>,
        );
      }
    }
    rows.push(
      <div
        key={layer}
        data-row={layer}
        data-state="off"
        className="relative border-lp-line px-4 py-3 not-first:border-t data-[state=off]:invisible"
      >
        <span data-port aria-hidden className={cn(PORT, '-left-[7px] hidden lg:block')} />
        <div>
          <p className="flex items-baseline gap-2">
            <span className="font-pixel text-[13.16px] leading-4 antialiased">{NAMES[layer]}</span>
            <span className="text-sm/5 text-pretty text-lp-ink-2">{ROLES[layer]}</span>
            {layer === 'core' && (
              <span className="ms-auto font-pixel text-[13.16px] leading-4 text-lp-ink-2 antialiased">
                fixed
              </span>
            )}
          </p>
          {chips.length > 0 && (
            <div
              role="radiogroup"
              aria-label={NAMES[layer]}
              className="mt-2 flex flex-wrap gap-0.75"
            >
              {chips}
            </div>
          )}
        </div>
      </div>,
    );
  }
  return (
    <div
      data-window
      data-state="off"
      className={cn('relative isolate data-[state=off]:invisible', className)}
    >
      <Shadow />
      <Window title={<span className="font-pixel text-[13.16px] antialiased">Your stack</span>}>
        <div data-rows className="relative">
          {rows}
        </div>
      </Window>
    </div>
  );
}

export function Stage({ header }: { header: ReactNode }) {
  return (
    <div ref={play} className="relative px-(--lp-gutter) py-(--lp-section)">
      {header}
      <div className="mt-2 grid md:-mt-6 lg:mt-0 lg:grid-cols-[minmax(0,56.5rem)_23rem] lg:justify-between lg:gap-x-12 xl:-mt-10 xl:grid-cols-[minmax(0,56.5rem)_25rem]">
        <div
          style={heights}
          className="relative -ms-(--lp-gutter) self-start md:ms-0 md:mb-6 md:max-w-226"
        >
          <div className="pb-(--phone) md:pb-(--wide)" />
          <canvas aria-hidden className="absolute inset-0 size-full" />
          {LAYERS.map((layer) => (
            <Leader key={layer} layer={layer} />
          ))}
          <div className="pointer-events-none absolute inset-0">
            <Plates />
            <Displays />
            <Screen />
            <Pages />
          </div>
          <p
            data-caption
            hidden
            className="absolute top-full left-0 mt-2 text-center font-pixel text-[13.16px] leading-4 text-balance text-lp-ink antialiased select-text"
          />
        </div>
        <Panel className="mt-12 md:mt-6 md:max-w-120 lg:mt-(--parts-panel) lg:self-start" />
      </div>
    </div>
  );
}
