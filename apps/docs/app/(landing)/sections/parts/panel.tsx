'use client';
import { Fragment, memo, type ReactNode } from 'react';
import { Select } from '@base-ui/react/select';
import { Chip } from '../../ui/chip';
import { DitherSwap } from '../../ui/dither';
import { Window } from '../../ui/window';
import { NAMES, OPTIONS, SWAPS, type SwapLayer } from './data';

/** the real setup of every option, highlighted on the server, by layer; `core` is each framework's on a headless UI */
export type Snippets = Record<SwapLayer, ReactNode[]> & { core: ReactNode[] };

export type Picks = Record<SwapLayer, number>;

/**
 * A select for each layer that swaps, in the stack's order beside its label, naming the module in
 * use: a pick presses the layer on the stack too. Its list drops under it, the option in use filled
 * as the page's pickers fill theirs, the one under a mouse or the keys inverted.
 */
export const Selects = memo(function Selects({
  picks,
  onPick,
}: {
  picks: Picks;
  onPick: (layer: SwapLayer, option: number) => void;
}) {
  const rows: ReactNode[] = [];
  for (const layer of SWAPS) {
    const options = OPTIONS[layer];
    const items: ReactNode[] = [];
    for (let i = 0; i < options.length; i++) {
      items.push(
        <Select.Item
          key={options[i].name}
          value={i}
          className="flex h-8 cursor-pointer items-center px-3 text-sm font-medium whitespace-nowrap outline-none select-none not-data-selected:hover:bg-lp-ink not-data-selected:hover:text-lp-paper not-data-selected:focus-visible:bg-lp-ink not-data-selected:focus-visible:text-lp-paper data-selected:bg-lp-yellow data-selected:text-lp-on-yellow data-selected:hover:inset-ring-2 data-selected:focus-visible:inset-ring-2 inset-ring-lp-on-yellow"
        >
          <Select.ItemText>{options[i].title}</Select.ItemText>
        </Select.Item>,
      );
    }
    rows.push(
      <Fragment key={layer}>
        <Chip aria-hidden layer={layer} className="h-8" />
        <Select.Root
          value={picks[layer]}
          onValueChange={(option) => option !== null && onPick(layer, option)}
        >
          <Select.Trigger
            aria-label={`${NAMES[layer]} layer`}
            className="flex h-8 min-w-0 cursor-pointer items-center justify-between gap-2 border border-lp-line-strong bg-lp-paper ps-3 pe-2.5 text-sm font-medium hover:bg-lp-paper-2 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink data-popup-open:bg-lp-paper-2"
          >
            <Select.Value className="min-w-0 truncate">
              {(option: number) => options[option].title}
            </Select.Value>
            <Select.Icon className="shrink-0">
              <svg aria-hidden viewBox="0 0 12 12" className="size-3">
                <path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} />
              </svg>
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              alignItemWithTrigger={false}
              align="start"
              sideOffset={4}
              className="z-50"
            >
              <Select.Popup className="max-w-(--available-width) min-w-(--anchor-width) border border-lp-line-strong bg-lp-paper text-lp-ink outline-none transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0">
                <Select.List className="max-h-(--available-height) scroll-py-1 overflow-y-auto py-1">
                  {items}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </Fragment>,
    );
  }
  return <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-2">{rows}</div>;
});

/**
 * The real setup of the option in use of the layer that landed last, every file whole: on a swap
 * the new file dithers in, from its top where the window scrolls.
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
    <Window
      title={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-pixel">{info.title}</span>
          <span className="shrink-0 text-lp-ink-2">{info.file}</span>
        </span>
      }
      className="parts-code [&_pre]:w-full [&_pre]:wrap-anywhere [&_pre]:whitespace-pre-wrap"
    >
      <DitherSwap
        swapKey={`${layer}:${option}:${core ? 'core' : 'ui'}`}
        opaque
        className="min-h-0 flex-1 grid-rows-1 *:overflow-y-auto"
      >
        {info.command && (
          <p className="border-b border-lp-line px-4 py-2 font-mono text-xs">
            <span className="text-lp-ink-2">$ </span>
            {info.command}
          </p>
        )}
        {(core ? snippets.core : snippets[layer])[option]}
      </DitherSwap>
    </Window>
  );
});
