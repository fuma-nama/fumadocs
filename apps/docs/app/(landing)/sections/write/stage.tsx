'use client';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { idle, whenSeen } from '../../lib/later';
import { Window } from '../../ui/window';
import { createPress } from './engine';
import { BED } from './scene';

const TONES = ['text-lp-ink', 'text-lp-ink-2', 'text-lp-orange'];

/** syntax in ink-2, numbers in orange, the rest in ink */
const SYNTAX =
  /(---|^#{1,6}(?= )|```\w*|<\/?|\/?>|[{}[\]()=:;,"']|\/\/.*$|\/\*.*?\*\/|\b(?:import|from|const|export|async|function|await|return|interface)\b)|(\b\d+\b)/g;

/** a plate a block: a row of 4 from xl, 2 rows round the rail band from md, tabs facing the rail */
const PLATES = [
  { place: 'md:col-start-1 md:row-start-1 md:border-r', foot: true },
  { place: 'md:col-start-2 md:row-start-1 xl:border-r', foot: true },
  { place: 'md:col-start-1 md:row-start-3 md:border-r xl:col-start-3 xl:row-start-1', foot: false },
  { place: 'md:col-start-2 md:row-start-3 xl:col-start-4 xl:row-start-1', foot: false },
];

/** a source line's words as inline blocks, so a long line wraps between words, not at a hyphen */
function words(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let word: ReactNode[] = [];
  function end() {
    if (word.length > 0)
      out.push(
        <span key={out.length} className="inline-block">
          {word}
        </span>,
      );
    word = [];
  }
  function add(text: string, tone: number) {
    for (const part of text.split(/( +)/)) {
      if (part === '') continue;
      if (part.startsWith(' ')) {
        end();
        out.push(part);
      } else
        word.push(
          <span key={word.length} className={TONES[tone]}>
            {part}
          </span>,
        );
    }
  }
  let last = 0;
  for (const match of line.matchAll(SYNTAX)) {
    if (match.index > last) add(line.slice(last, match.index), 0);
    add(match[0], match[1] ? 1 : 2);
    last = match.index + match[0].length;
  }
  if (last < line.length) add(line.slice(last), 0);
  end();
  return out;
}

function mount(stage: HTMLDivElement | null) {
  if (!stage) return;
  // the WebGL context, its shader and her ticker wait until the figure is within a viewport of the
  // screen and the page is still, so neither hydration nor a scroll pays for them
  let destroy: (() => void) | undefined;
  let stopIdle: (() => void) | undefined;
  const stopView = whenSeen(
    stage,
    () => {
      stopIdle = idle(() => {
        destroy = createPress(stage);
      });
    },
    { rootMargin: '100% 0px' },
  );
  return () => {
    stopView();
    stopIdle?.();
    destroy?.();
  };
}

interface StageProps {
  /** the MDX file on the bed */
  file: string;
  steps: { tab: string; status: string }[];
  sources: string[];
  /** each block's compiled output */
  slots: ReactNode[];
  /** the rail band at the bed's foot, and the rail up a phone's column */
  bed: ReactNode;
  column: ReactNode;
}

/** the finished page, each block's source hidden under its output till the engine writes it */
export function Stage({ file, steps, sources, slots, bed, column }: StageProps) {
  return (
    <div className="px-(--lp-gutter) pb-(--lp-gutter)">
      <div ref={mount} data-file={file} className="relative flex">
        <Window
          data-doc
          title={file}
          actions={
            <button
              type="button"
              data-replay
              aria-label="Replay"
              className="relative inline-flex size-6 items-center justify-center bg-lp-paper text-lp-ink-2 transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none motion-reduce:hidden [@media(scripting:none)]:hidden"
            >
              <RotateCcw aria-hidden className="size-4" />
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
                  // framed while held for a press, where the card the canvas draws stands
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
                    // 13px on a phone's full-width plates; from md 12px where a plate holds its
                    // longest line, 11px where it has to
                    className="invisible font-mono text-[13px] leading-[20px] [font-variant-ligatures:none] md:text-[11px] md:leading-[17px] md:@min-[296px]:text-xs md:@min-[296px]:leading-[18px]"
                  >
                    {sources[i].split('\n').map((line, j) => (
                      <div
                        key={j}
                        data-line
                        className="min-h-[1lh] wrap-anywhere whitespace-break-spaces"
                      >
                        {words(line)}
                      </div>
                    ))}
                  </div>
                  <div
                    data-out
                    // zoomed out like a browser to fit its plate; a stacking context keeps popovers
                    // like Twoslash's under the arm
                    className={cn(
                      'isolate bg-lp-paper md:max-lg:[zoom:0.9] lg:max-xl:[zoom:0.8] xl:[zoom:0.82] [&_.twoslash-completion-list]:w-56! [&_.twoslash-completion-list]:select-text!',
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
        <div data-bay-phone className="relative w-[72px] shrink-0 md:hidden">
          {column}
        </div>
        <span
          data-caret
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 bg-lp-ink"
        />
        <canvas
          data-arm
          aria-hidden
          className="pointer-events-none absolute inset-0 z-2 size-full"
        />
        <canvas
          data-mate
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 z-3 [image-rendering:pixelated]"
        />
        <p data-voice aria-live="polite" className="sr-only" />
      </div>
    </div>
  );
}
