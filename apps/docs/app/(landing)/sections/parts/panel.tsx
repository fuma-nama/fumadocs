'use client';
import { Fragment, type KeyboardEvent, memo, type ReactNode } from 'react';
import { Chip } from '../../ui/chip';
import { DitherSwap } from '../../ui/dither';
import { Window } from '../../ui/window';
import { OPTIONS, SWAPS, type SwapLayer } from './data';

/** the real setup of every option, highlighted on the server, by layer; `core` is each framework's on a headless UI */
export type Snippets = Record<SwapLayer, ReactNode[]> & { core: ReactNode[] };

export type Picks = Record<SwapLayer, number>;

const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/**
 * Each swap layer's options as a radio group of keys: the key in use is filled, hover inverts and
 * arrow keys move. Keys share columns, 3 where each name still fits on one line, else 2, beside
 * their labels or, in a narrow panel, under them.
 */
export const Keys = memo(function Keys({
  picks,
  onPick,
}: {
  picks: Picks;
  onPick: (layer: SwapLayer, option: number) => void;
}) {
  const groups: ReactNode[] = [];
  for (const layer of SWAPS) {
    const options = OPTIONS[layer];
    const pick = picks[layer];
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const step = STEP[event.key];
      if (!step) return;
      event.preventDefault();
      const next = (pick + step + options.length) % options.length;
      onPick(layer, next);
      event.currentTarget.parentElement!.querySelectorAll('button')[next].focus();
    };
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
    groups.push(
      <Fragment key={layer}>
        <Chip
          data-rise
          layer={layer}
          className="h-8 @max-[24rem]:hidden @min-[24rem]:justify-self-stretch"
        />
        <div
          data-rise
          role="radiogroup"
          aria-label={`${layer} layer`}
          className="grid grid-cols-2 gap-2 @min-[33rem]:grid-cols-3"
        >
          {/* in a narrow panel the label is the group's first cell, a row shorter */}
          <Chip aria-hidden layer={layer} className="h-8 @min-[24rem]:hidden" />
          {buttons}
        </div>
      </Fragment>,
    );
  }
  return (
    <div className="grid items-start gap-2 @min-[24rem]:grid-cols-[auto_minmax(0,1fr)]">
      {groups}
    </div>
  );
});

/**
 * The real setup of the option in use of the layer that landed last, every file whole: on a swap
 * the new file dithers in while the window eases to its height. Where the whole stage pins at a
 * MacBook Air's height, the code is a size smaller so the tallest file still fits beside the stack.
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
  const core = layer === 'framework' && headless;

  return (
    <div data-rise data-window className="@container">
      <Window
        title={
          // in a phone's panel the file alone: its option is lit in the keys above
          <span className="flex items-center gap-2 font-mono text-xs">
            <span className="@max-[22rem]:hidden">{info.title}</span>
            <span className="text-lp-ink-2">{info.file}</span>
          </span>
        }
        className="overflow-hidden [&_pre]:w-full [&_pre]:wrap-anywhere [&_pre]:whitespace-pre-wrap max-sm:[&_pre]:text-[11px]/[15px] [@media(min-width:1348px)_and_(min-height:884px)_and_(max-height:947px)]:[&_pre]:text-[11px]/[15px]"
      >
        <DitherSwap swapKey={`${layer}:${option}:${core ? 'core' : 'ui'}`} opaque resize={560}>
          {info.command && (
            <p className="border-b border-lp-line px-4 py-2 font-mono text-xs">
              <span className="text-lp-ink-2">$ </span>
              {info.command}
            </p>
          )}
          {(core ? snippets.core : snippets[layer])[option]}
        </DitherSwap>
      </Window>
    </div>
  );
});
