'use client';
import {
  Fragment,
  type KeyboardEvent,
  memo,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useReducedMotion } from 'motion/react';
import { settleCss } from '../../lib/motion';
import { Chip } from '../../ui/spec';
import { Window } from '../../ui/window';
import { cn } from '@/lib/cn';
import { type Option, OPTIONS, SWAPS, type SwapLayer } from './data';

/** the real setup of every option, highlighted on the server, by layer; `core` is each framework's on a headless UI */
export type Snippets = Record<SwapLayer, ReactNode[]> & { core: ReactNode[] };

export type Picks = Record<SwapLayer, number>;

type OnPick = (layer: SwapLayer, option: number) => void;

/** the option of the UI layer with no UI package: the framework's provider comes from the core */
export const HEADLESS = 1;

/**
 * Every option of each layer that swaps as a key, a group per layer in the order of the trays: a
 * radio group where the key in use is filled, hover inverts and arrow keys move. One grid in the
 * panel's width: the labels in a column of their own and the keys in shared columns, 3 where each
 * name still fits on one line, else 2; in a narrow panel each label sits above its keys.
 */
export const Keys = memo(function Keys({ picks, onPick }: { picks: Picks; onPick: OnPick }) {
  const groups: ReactNode[] = [];
  for (const layer of SWAPS) {
    groups.push(
      <Fragment key={layer}>
        <Chip
          data-rise
          layer={layer}
          className="h-8 justify-self-start @min-[24rem]:justify-self-stretch"
        />
        <Group layer={layer} options={OPTIONS[layer]} pick={picks[layer]} onPick={onPick} />
      </Fragment>,
    );
  }
  return (
    <div className="grid items-start gap-2 @min-[24rem]:grid-cols-[auto_minmax(0,1fr)]">
      {groups}
    </div>
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
    onPick(layer, next);
    (event.currentTarget.parentElement!.children[next] as HTMLElement).focus();
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
        onClick={() => i !== pick && onPick(layer, i)}
        onKeyDown={onKeyDown}
        className="flex h-8 cursor-pointer items-center border border-lp-line-strong px-3 text-[12px] whitespace-nowrap not-aria-checked:hover:bg-lp-ink not-aria-checked:hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink aria-checked:bg-lp-yellow aria-checked:text-[#121210]"
      >
        {options[i].title}
      </button>,
    );
  }

  return (
    <div
      data-rise
      role="radiogroup"
      aria-label={`${layer} layer`}
      className="grid grid-cols-2 gap-2 @min-[33rem]:grid-cols-3"
    >
      {buttons}
    </div>
  );
}

/**
 * One of several layers in one cell, by key. At rest only the layer shown is mounted: a new one
 * mounts on top and dithers in over the old, which unmounts once it is covered. With reduced
 * motion, it replaces the old at once. `fit` takes the new layer's size at once, the old one
 * covered out of the flow.
 */
export function Crossfade({
  shown,
  render,
  fit = false,
  className,
}: {
  shown: string;
  render: (key: string) => ReactNode;
  fit?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [layers, setLayers] = useState([shown]);
  let current = layers;
  if (current[current.length - 1] !== shown) {
    // the layer it covers keeps its DOM until the dither ends; any older one is already covered
    current = reduced ? [shown] : [current[current.length - 1], shown];
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
          fit && key !== shown && 'absolute inset-x-0 top-0',
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
  return <div className={cn('relative grid', className)}>{out}</div>;
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
 * The real setup of the option in use of the layer that landed last, in a window that fits it,
 * every file of them whole: on a swap the window eases to its new height while the new file
 * dithers in. Where the whole stage pins at a MacBook Air's height, the code is a size smaller so
 * the tallest file still fits beside the stack.
 */
export const CodeWindow = memo(function CodeWindow({
  className,
  layer,
  option,
  headless,
  snippets,
}: {
  className?: string;
  layer: SwapLayer;
  option: number;
  headless: boolean;
  snippets: Snippets;
}) {
  const info = OPTIONS[layer][option];

  const shown = `${layer}:${option}:${layer === 'framework' && headless ? 'core' : 'ui'}`;
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = ref.current!;
    // the crossfade's cell: the old file still covered by the new one, out of the flow
    const files = box.lastElementChild!.children;
    if (files.length < 2) return;
    const to = box.offsetHeight;
    const from =
      to - (files[1] as HTMLElement).offsetHeight + (files[0] as HTMLElement).offsetHeight;
    if (from === to) return;
    const animation = box.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: 560,
      easing: settleCss,
    });
    return () => animation.cancel();
  }, [shown]);

  return (
    <div data-rise data-window className={cn('@container', className)}>
      <Window
        ref={ref}
        title={
          // in a phone's panel the file alone: its option is lit in the keys above
          <span className="flex items-center gap-2 font-mono text-xs">
            <span className="@max-[22rem]:hidden">{info.title}</span>
            <span className="text-lp-ink-2">{info.file}</span>
          </span>
        }
        className="overflow-hidden [&_pre]:w-full [&_pre]:wrap-anywhere [&_pre]:whitespace-pre-wrap max-sm:[&_pre]:text-[11px]/[15px] [@media(min-width:1348px)_and_(min-height:884px)_and_(max-height:947px)]:[&_pre]:text-[11px]/[15px]"
      >
        <Crossfade
          fit
          shown={shown}
          render={(key) => {
            const [name, index, kind] = key.split(':') as [SwapLayer, string, string];
            const i = Number(index);
            const list = name === 'framework' && kind === 'core' ? snippets.core : snippets[name];
            return <File option={OPTIONS[name][i]}>{list[i]}</File>;
          }}
        />
      </Window>
    </div>
  );
});
