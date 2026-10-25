'use client';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Window } from '../../ui/window';
import { createPress } from './engine';
import { type Step, tokenize } from './steps';

const TONES = ['text-lp-ink', 'text-lp-ink-2', 'text-lp-orange'];

function mount(stage: HTMLDivElement | null) {
  if (stage) return createPress(stage);
}

interface PressProps {
  steps: Step[];
  /** the source of each step's block */
  sources: string[];
  /** the compiled output of each block */
  slots: ReactNode[];
}

/**
 * `quick-start.mdx` and the arm that presses it. The server renders the finished page, each block's
 * source hidden under its output; once the stage is in view, the engine writes it again.
 */
export function Press({ steps, sources, slots }: PressProps) {
  return (
    <div ref={mount} className="relative flex px-(--lp-gutter) pb-(--lp-gutter)">
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
        className="min-w-0 flex-1 lg:w-[720px] lg:flex-none xl:w-[830px]"
      >
        <div className="flex flex-col gap-4 px-4 py-5 lg:gap-3 lg:px-6 lg:py-4 xl:px-8 xl:py-6">
          {slots.map((slot, i) => (
            <div
              key={i}
              data-block
              data-status={steps[i].status}
              className="relative -mx-2 -my-2 grid origin-top-left gap-2 bg-lp-paper px-2 py-2 lg:-mx-3 lg:grid-cols-[minmax(0,1fr)_128px] lg:gap-6 lg:px-3"
            >
              <div className="grid *:col-start-1 *:row-start-1 max-lg:row-start-2">
                <div
                  data-src
                  className="invisible font-mono text-[11px] leading-4 [font-variant-ligatures:none] lg:text-xs lg:leading-[18px] xl:text-[13px] xl:leading-5"
                >
                  {sources[i].split('\n').map((line, j) => (
                    <div key={j} data-line className="h-[1lh] whitespace-pre">
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
                  // the page zoomed out like a browser, so it fits beside its arm; its own stacking
                  // context keeps popovers like Twoslash's under the arm
                  className={cn(
                    'isolate bg-lp-paper max-lg:[zoom:0.82] lg:[zoom:0.85] xl:[zoom:1] [&_.twoslash-completion-list]:select-text! max-lg:[&_.twoslash-completion-list]:w-56!',
                    i > 0 && 'prose [&>:first-child]:mt-0 [&>:last-child]:mb-0',
                  )}
                >
                  {slot}
                </div>
              </div>
              <span
                data-tab
                className="inline-flex h-7 items-center self-start border border-lp-line bg-lp-paper px-3 font-mono text-xs whitespace-pre text-lp-ink-2 data-inverted:bg-lp-ink data-inverted:text-lp-paper max-lg:row-start-1 max-lg:justify-self-end"
              >
                {steps[i].tab}
              </span>
            </div>
          ))}
        </div>
      </Window>
      <div data-bay className="w-12 shrink-0 lg:w-auto lg:flex-1" />
      <span
        data-caret
        aria-hidden
        className="lp-caret pointer-events-none invisible absolute top-0 left-0 bg-lp-ink"
      />
      <canvas data-arm aria-hidden className="pointer-events-none absolute inset-0 z-2 size-full" />
    </div>
  );
}
