'use client';
import { type KeyboardEvent, memo, type ReactNode, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Chip, type Layer } from '../../ui/spec';
import { Window } from '../../ui/window';
import { cn } from '@/lib/cn';
import { type Option, slots } from './data';

export type SwapLayer = 'ui' | 'content' | 'framework';
export type Picks = Record<SwapLayer, number>;
/** the real setup of every option, highlighted on the server, by layer */
export type Snippets = Record<SwapLayer, ReactNode[]>;

export function optionsOf(layer: Layer): Option[] {
  for (const slot of slots) if (slot.layer === layer) return slot.options;
  return [];
}

export interface Swap {
  /** what the reader picked, the keys show it at once */
  picks: Picks;
  /** what the block holds: a pick lands once its drawer is out */
  shown: Picks;
  /** the layer that landed last, its file is in the code window */
  last: SwapLayer;
  /** how many picks landed: nothing dithers before the first */
  swaps: number;
}

export interface SwapActions {
  /** the reader picked an option */
  pick: (layer: SwapLayer, option: number) => void;
  /** a pick landed in the block */
  land: (layer: SwapLayer, option: number) => void;
  /** back to the layer's first option, at once */
  reset: (layer: SwapLayer) => void;
}

const initial: Picks = { ui: 0, content: 0, framework: 0 };

/** the one state of the figure's swaps, shared by both of its layouts */
export function useSwap() {
  const [state, setState] = useState<Swap>({
    picks: initial,
    shown: initial,
    last: 'content',
    swaps: 0,
  });
  const actions = useMemo<SwapActions>(
    () => ({
      pick: (layer, option) =>
        setState((prev) => ({ ...prev, picks: { ...prev.picks, [layer]: option } })),
      land: (layer, option) =>
        setState((prev) => ({
          ...prev,
          shown: { ...prev.shown, [layer]: option },
          last: layer,
          swaps: prev.swaps + 1,
        })),
      reset: (layer) =>
        setState((prev) =>
          prev.picks[layer] === 0 && prev.shown[layer] === 0
            ? prev
            : {
                ...prev,
                picks: { ...prev.picks, [layer]: 0 },
                shown: { ...prev.shown, [layer]: 0 },
              },
        ),
    }),
    [],
  );
  return { state, actions };
}

export type OnPick = (layer: SwapLayer, option: number, from: Element) => void;

const key =
  '-ms-px flex h-8 items-center border border-lp-line-strong px-3 text-[13px] whitespace-nowrap first:ms-0';

/**
 * Every option of each layer that swaps as a key, a row per layer in the order of the drawers:
 * a radio group where the key in use is filled, hover inverts and arrow keys move.
 */
export const Keys = memo(function Keys({ picks, onPick }: { picks: Picks; onPick: OnPick }) {
  const rows: ReactNode[] = [];
  for (const slot of slots) {
    if (!slot.swappable) continue;
    const layer = slot.layer as SwapLayer;
    rows.push(
      <div key={layer} className="contents">
        <Chip layer={layer} className="h-8" />
        <Group layer={layer} options={slot.options} pick={picks[layer]} onPick={onPick} />
      </div>,
    );
  }
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2">{rows}</div>
  );
});

function Group({
  layer,
  options,
  pick,
  onPick,
}: {
  layer: SwapLayer;
  options: Option[];
  pick: number;
  onPick: OnPick;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (pick + step + options.length) % options.length;
    const group = event.currentTarget.parentElement!;
    onPick(layer, next, group);
    (group.children[next] as HTMLElement).focus();
  }

  const buttons: ReactNode[] = [];
  for (let i = 0; i < options.length; i++) {
    buttons.push(
      <button
        key={options[i].name}
        type="button"
        role="radio"
        aria-checked={i === pick}
        tabIndex={i === pick ? 0 : -1}
        onClick={(event) => i !== pick && onPick(layer, i, event.currentTarget)}
        onKeyDown={onKeyDown}
        className={cn(
          key,
          'cursor-pointer not-aria-checked:hover:bg-lp-ink not-aria-checked:hover:text-lp-paper focus-visible:relative focus-visible:z-1 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink aria-checked:bg-lp-yellow aria-checked:text-[#121210]',
        )}
      >
        {options[i].title}
      </button>,
    );
  }

  return (
    <div role="radiogroup" aria-label={`${layer} layer`} className="flex flex-wrap gap-y-2">
      {buttons}
    </div>
  );
}

/** an option's file: the command that wrote it, if any, and its code */
function File({ option, children }: { option: Option; children: ReactNode }) {
  return (
    <>
      {option.command && (
        <p className="border-b border-lp-line px-4 py-2 font-mono text-xs">
          <span className="text-lp-ink-2">$ </span>
          {option.command}
        </p>
      )}
      {children}
    </>
  );
}

/**
 * One of several layers in one cell, by key. At rest only the layer shown is mounted: a new one
 * mounts on top and dithers in over the old, which unmounts once it is covered. With `animate` off
 * (before the first swap) or reduced motion, it replaces the old at once.
 */
export function Crossfade({
  shown,
  animate,
  render,
}: {
  shown: string;
  animate: boolean;
  render: (key: string) => ReactNode;
}) {
  const reduced = useReducedMotion();
  const [layers, setLayers] = useState([shown]);
  let current = layers;
  if (current[current.length - 1] !== shown) {
    // the layer it covers keeps its DOM until the dither ends; any older one is already covered,
    // and in a hidden layout, where no dither runs, they stay at two
    current = animate && !reduced ? [current[current.length - 1], shown] : [shown];
    setLayers(current);
  }

  const out: ReactNode[] = [];
  for (const key of current) {
    const top = key === shown && current.length > 1;
    out.push(
      <div
        key={key}
        // opaque and isolated, so the dither covers what is under it cell by cell
        className={cn(
          'isolate col-start-1 row-start-1 bg-lp-paper',
          top && 'animate-[lp-dither-in_420ms_linear] [mask-size:16px_16px]',
        )}
        onAnimationEnd={
          top
            ? (event) => {
                if (event.target === event.currentTarget) setLayers([shown]);
              }
            : undefined
        }
      >
        {render(key)}
      </div>,
    );
  }
  return <div className="grid">{out}</div>;
}

/** the files that can be the tallest: the most lines when nothing wraps, the most characters when it all does */
const TALLEST: Option[] = (() => {
  let lines: Option | undefined;
  let chars: Option | undefined;
  for (const slot of slots) {
    if (!slot.swappable) continue;
    for (const option of slot.options) {
      if (!lines || option.code.split('\n').length > lines.code.split('\n').length) lines = option;
      if (!chars || option.code.length > chars.code.length) chars = option;
    }
  }
  return lines === chars ? [lines!] : [lines!, chars!];
})();

/**
 * The real setup of the option in use of the layer that landed last. Plain copies of the tallest
 * files hold the window's height as they wrap at this width, so a swap never moves what is around
 * it.
 */
export const CodeWindow = memo(function CodeWindow({
  layer,
  option,
  snippets,
  animate,
  className,
}: {
  layer: SwapLayer;
  option: number;
  snippets: Snippets;
  animate: boolean;
  className?: string;
}) {
  const info = optionsOf(layer)[option];
  const sizers: ReactNode[] = [];
  for (const file of TALLEST) {
    sizers.push(
      <div key={file.name} aria-hidden className="invisible">
        <File option={file}>
          {/* the code block's own metrics: its viewport's padding and its lines' */}
          <pre className="py-3 ps-4 pe-8 font-mono text-[12px]/[16px] wrap-anywhere whitespace-pre-wrap">
            {file.code}
          </pre>
        </File>
      </div>,
    );
  }

  return (
    <Window
      title={
        <span className="flex items-center gap-2 font-mono text-xs">
          {info.title}
          <span className="text-lp-ink-2">{info.file}</span>
        </span>
      }
      className={cn('overflow-hidden', className)}
    >
      <div className="grid *:col-start-1 *:row-start-1">
        {sizers}
        <Crossfade
          shown={`${layer}:${option}`}
          animate={animate}
          render={(key) => {
            const [name, index] = key.split(':') as [SwapLayer, string];
            return (
              <File option={optionsOf(name)[Number(index)]}>{snippets[name][Number(index)]}</File>
            );
          }}
        />
      </div>
    </Window>
  );
});
