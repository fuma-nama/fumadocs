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
        <Chip layer={layer} className="h-8 justify-self-start @min-[24rem]:justify-self-stretch" />
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
}: {
  shown: string;
  render: (key: string) => ReactNode;
  fit?: boolean;
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
  return <div className="relative grid">{out}</div>;
}

interface FileInfo {
  option: Option;
  code: string;
}

function rows(file: FileInfo) {
  return file.code.split('\n').length + (file.option.command ? 2 : 0);
}

/** the files that can be the tallest: the most lines when nothing wraps, the most characters when it all does */
const TALLEST: FileInfo[] = (() => {
  let lines: FileInfo | undefined;
  let chars: FileInfo | undefined;
  for (const layer of SWAPS) {
    const options = OPTIONS[layer];
    for (let i = 0; i < options.length; i++) {
      const codes =
        layer === 'framework'
          ? [OPTIONS.framework[i].code, OPTIONS.framework[i].core]
          : [options[i].code];
      for (const code of codes) {
        const file = { option: options[i], code };
        if (!lines || rows(file) > rows(lines)) lines = file;
        if (!chars || code.length > chars.code.length) chars = file;
      }
    }
  }
  return lines === chars ? [lines!] : [lines!, chars!];
})();

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

/** the code block's own metrics: its viewport's padding and its lines' */
const metrics =
  'py-3 ps-4 pe-8 font-mono text-[12px]/[16px] wrap-anywhere whitespace-pre-wrap max-sm:text-[11px]/[15px]';

/**
 * The real setup of the option in use of the layer that landed last, in a window that fits it.
 * Beside the stack, plain copies of the tallest files hold the room it may grow into as they wrap
 * at its width, so a swap never moves what is after it; under the stack, only what follows the
 * window moves, with the pick. On a swap the window eases to its new height while the new file
 * dithers in.
 */
export const CodeWindow = memo(function CodeWindow({
  layer,
  option,
  headless,
  snippets,
}: {
  layer: SwapLayer;
  option: number;
  headless: boolean;
  snippets: Snippets;
}) {
  const info = OPTIONS[layer][option];
  const sizers: ReactNode[] = [];
  for (const file of TALLEST) {
    sizers.push(
      <Window key={file.code} aria-hidden className="invisible max-lg:hidden">
        <File option={file.option}>
          <pre className={metrics}>{file.code}</pre>
        </File>
      </Window>,
    );
  }

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
    <div className="grid items-start *:col-start-1 *:row-start-1">
      {sizers}
      <Window
        ref={ref}
        title={
          // in a phone's panel the file alone: its option is lit in the keys above
          <span className="flex items-center gap-2 font-mono text-xs">
            <span className="@max-[22rem]:hidden">{info.title}</span>
            <span className="text-lp-ink-2">{info.file}</span>
          </span>
        }
        className="overflow-hidden [&_pre]:w-full [&_pre]:wrap-anywhere [&_pre]:whitespace-pre-wrap max-sm:[&_pre]:text-[11px]/[15px]"
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
