'use client';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Window } from '../../ui/window';
import { BED } from './arm';
import { createPress } from './engine';
import { type Step, tokenize } from './steps';

const TONES = ['text-lp-ink', 'text-lp-ink-2', 'text-lp-orange'];

/**
 * Each plate's place on the bed: a row of 4 from xl, 2 rows round the rail band from md, its seams
 * on the sides that meet another plate. Its tab faces the rail: at the foot of a plate above it, at
 * the top of one below it.
 */
const PLATES = [
  { place: 'md:col-start-1 md:row-start-1 md:border-r', foot: true },
  { place: 'md:col-start-2 md:row-start-1 xl:border-r', foot: true },
  { place: 'md:col-start-1 md:row-start-3 md:border-r xl:col-start-3 xl:row-start-1', foot: false },
  { place: 'md:col-start-2 md:row-start-3 xl:col-start-4 xl:row-start-1', foot: false },
];

function mount(stage: HTMLDivElement | null) {
  if (stage) return createPress(stage);
}

interface PressProps {
  steps: Step[];
  /** the source of each step's block */
  sources: string[];
  /** the compiled output of each block */
  slots: ReactNode[];
  /** the rail band at the bed's foot, and the rail up a phone's column */
  bed: ReactNode;
  column: ReactNode;
}

/**
 * `quick-start.mdx` on the press's bed, a plate a block, and the rail its rig rides. The server
 * renders the finished page, each block's source hidden under its output; once the stage is in
 * view, the engine writes it again.
 */
export function Press({ steps, sources, slots, bed, column }: PressProps) {
  return (
    <div className="px-(--lp-gutter) pb-(--lp-gutter)">
      <div ref={mount} className="relative flex">
        <Window
          data-doc
          title="quick-start.mdx"
          actions={
            <button
              type="button"
              data-replay
              className="relative inline-flex h-6 items-center gap-1 bg-lp-paper px-1.5 font-pixel text-[11px] leading-none text-lp-ink-2 transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none motion-reduce:hidden [@media(scripting:none)]:hidden"
            >
              <RotateCcw aria-hidden className="size-3" />
              replay
            </button>
          }
          className="min-w-0 flex-1"
        >
          <div className="flex flex-col gap-4 px-4 py-5 md:grid md:grid-cols-2 md:gap-0 md:p-0 xl:grid-cols-4">
            {slots.map((slot, i) => (
              <div
                key={i}
                data-block
                data-status={steps[i].status}
                className={cn(
                  // held for a press, a frame inside its seams, where the card the canvas draws stands
                  'relative -mx-2 -my-2 grid grid-cols-[minmax(0,1fr)] gap-2 border-lp-line bg-lp-paper px-2 py-2 data-[framed]:shadow-[inset_0_0_0_4px_var(--lp-paper),inset_0_0_0_5px_var(--lp-line-strong)] md:m-0 md:gap-3 md:p-3',
                  PLATES[i].place,
                  PLATES[i].foot
                    ? 'md:grid-rows-[minmax(0,1fr)_auto]'
                    : 'md:grid-rows-[auto_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)_auto]',
                )}
              >
                <button
                  type="button"
                  data-tab
                  aria-pressed="false"
                  className={cn(
                    'relative inline-flex h-7 cursor-pointer items-center justify-self-start border border-lp-line bg-lp-paper px-3 font-mono text-xs whitespace-pre text-lp-ink-2 transition-none before:absolute before:top-1/2 before:left-1 before:hidden before:size-1 before:-translate-y-1/2 before:bg-current after:absolute after:-inset-y-2 after:inset-x-0 hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none data-inverted:bg-lp-ink data-inverted:text-lp-paper aria-pressed:bg-lp-yellow aria-pressed:text-[#121210] data-queued:bg-lp-ink data-queued:text-lp-paper data-queued:before:block data-queued:before:animate-[lp-caret_1s_steps(1,end)_infinite] [@media(scripting:none)]:pointer-events-none',
                    PLATES[i].foot ? 'md:row-start-2' : 'xl:row-start-2',
                  )}
                >
                  {steps[i].tab}
                </button>
                <div
                  className={cn(
                    'grid grid-cols-[minmax(0,1fr)] @container *:col-start-1 *:row-start-1',
                    PLATES[i].foot ? 'md:row-start-1' : 'xl:row-start-1',
                  )}
                >
                  <div
                    data-src
                    // 12px where a plate holds its longest line, 11px where it has to
                    className="invisible font-mono text-[11px] leading-[17px] [font-variant-ligatures:none] @min-[296px]:text-xs @min-[296px]:leading-[18px]"
                  >
                    {sources[i].split('\n').map((line, j) => (
                      // a line too long for the plate wraps at any character, so its rows are even
                      <div
                        key={j}
                        data-line
                        className="min-h-[1lh] break-all whitespace-break-spaces"
                      >
                        {tokenize(line).map(([text, tone], k) => (
                          <span key={k} className={TONES[tone]}>
                            {text}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div
                    data-out
                    // the page zoomed out like a browser to fit its plate; its own stacking context
                    // keeps popovers like Twoslash's under the arm
                    className={cn(
                      'isolate bg-lp-paper [zoom:0.82] md:max-xl:[zoom:0.8] [&_.twoslash-completion-list]:w-56! [&_.twoslash-completion-list]:select-text!',
                      i > 0 && 'prose [&>:first-child]:mt-0 [&>:last-child]:mb-0',
                    )}
                  >
                    {slot}
                  </div>
                </div>
              </div>
            ))}
            <div
              data-bay
              className="relative max-md:hidden md:col-span-2 md:row-start-2 md:border-y md:border-lp-line xl:col-span-4 xl:border-b-0"
              style={{ height: BED.height }}
            >
              {bed}
            </div>
          </div>
        </Window>
        <div data-bay-phone className="relative w-12 shrink-0 md:hidden">
          {column}
        </div>
        <span
          data-caret
          aria-hidden
          className="lp-caret pointer-events-none invisible absolute top-0 left-0 bg-lp-ink"
        />
        <canvas
          data-arm
          aria-hidden
          className="pointer-events-none absolute inset-0 z-2 size-full"
        />
        {/* her, and her moon on its ring, a pixel a cell */}
        <canvas
          data-mate
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 z-3 [image-rendering:pixelated]"
        />
        {/* what a screen reader hears of a reader's presses */}
        <p data-voice aria-live="polite" className="sr-only" />
      </div>
    </div>
  );
}
