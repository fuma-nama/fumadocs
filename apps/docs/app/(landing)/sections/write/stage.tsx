'use client';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Window } from '../../ui/window';
import type { Step } from './data';
import { createPress } from './engine';
import { BED } from './scene';

const TONES = ['text-lp-ink', 'text-lp-ink-2', 'text-lp-orange'];
/** a rivet ring, set in each corner of a plate */
const RIVET =
  'radial-gradient(circle, var(--lp-paper) 1.5px, var(--lp-ink-2) 2px 2.75px, transparent 3.25px)';
const RIVETS = `${RIVET} 0 0 / 7px 7px no-repeat, ${RIVET} 100% 0 / 7px 7px no-repeat, ${RIVET} 0 100% / 7px 7px no-repeat, ${RIVET} 100% 100% / 7px 7px no-repeat`;
/** the source's type, which sizes the caret a character by a line */
const SOURCE = 'font-mono text-[13px]/5 md:text-xs/[18px]';

/** syntax in ink-2, numbers in orange, the rest in ink */
const SYNTAX =
  /(---|^#{1,6}(?= )|```\w*|<\/?|\/?>|[{}[\]()=:;,"']|\/\/.*$|\/\*.*?\*\/|\b(?:import|from|const|export|async|function|await|return|interface)\b)|(\b\d+\b)/g;

/** a plate a block, 2 rows round the rail band from md, its trigger facing the rail; its frame
 * reaches over its border */
const PLATES = [
  { place: 'md:col-start-1 md:row-start-1 md:border-r md:before:-right-px', foot: true },
  { place: 'md:col-start-2 md:row-start-1', foot: true },
  { place: 'md:col-start-1 md:row-start-3 md:border-r md:before:-right-px', foot: false },
  { place: 'md:col-start-2 md:row-start-3', foot: false },
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
  if (stage) return createPress(stage);
}

interface StageProps {
  /** the MDX file on the bed */
  file: string;
  steps: Step[];
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
    <div className="px-(--lp-gutter) pb-(--lp-section)">
      {/* what moves here gets a layer, and so does all painted over it: the clip keeps them to the stage */}
      <div ref={mount} data-file={file} className="relative flex overflow-clip">
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
          <div className="flex flex-col gap-8 px-4 py-6 md:grid md:grid-cols-2 md:gap-0 md:p-0">
            {slots.map((slot, i) => (
              <div
                key={i}
                data-block
                data-status={steps[i].status}
                className={cn(
                  // framed while held for a press, where the card the canvas draws stands: the frame
                  // is a box of its own, as an outlined one repaints whenever anything in it moves
                  'relative -m-2 grid grid-cols-1 gap-3 border-lp-line bg-lp-paper p-2 before:pointer-events-none before:absolute before:inset-0 data-framed:before:outline data-framed:before:-outline-offset-5 data-framed:before:outline-lp-line-strong md:m-0 md:gap-5 md:p-6 xl:p-8',
                  PLATES[i].place,
                  PLATES[i].foot
                    ? 'md:grid-rows-[minmax(0,1fr)_auto]'
                    : 'md:grid-rows-[auto_minmax(0,1fr)]',
                )}
              >
                {/* riveted to the bed */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-1 max-md:hidden"
                  style={{ background: RIVETS }}
                />
                {/* the plate's nameplate on the press, in the bed's lines: its lamp lit while the
                    plate shows its Markdown, blinking while its press waits for the sequence */}
                <button
                  type="button"
                  data-tab
                  // pressed while the block shows its Markdown
                  aria-label={`${steps[i].tab} Markdown`}
                  aria-pressed="false"
                  className={cn(
                    'group/tab relative flex h-8 cursor-pointer justify-self-start border border-lp-ink-2 bg-lp-paper font-pixel text-sm whitespace-pre text-lp-ink-2 transition-none after:absolute after:-inset-y-2 after:inset-x-0 hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none data-inverted:bg-lp-ink data-inverted:text-lp-paper aria-pressed:bg-lp-yellow aria-pressed:text-lp-on-yellow [@media(scripting:none)]:pointer-events-none',
                    PLATES[i].foot && 'md:row-start-2',
                  )}
                >
                  <span
                    aria-hidden
                    className="flex aspect-square items-center justify-center border-e border-current"
                  >
                    <span className="relative size-2.5 rounded-full border border-current before:absolute before:inset-0 before:hidden before:rounded-full before:bg-lp-sun group-aria-pressed/tab:before:block group-data-queued/tab:before:block group-data-queued/tab:before:animate-lp-caret motion-reduce:before:animate-none" />
                  </span>
                  <span className="flex items-center px-2.5">{steps[i].tab}</span>
                </button>
                <div
                  className={cn(
                    'grid grid-cols-1 *:col-start-1 *:row-start-1',
                    PLATES[i].foot && 'md:row-start-1',
                  )}
                >
                  <div data-src className={`invisible ${SOURCE} [font-variant-ligatures:none]`}>
                    {sources[i].split('\n').map((line, j) => (
                      <div
                        key={j}
                        data-line
                        className="min-h-lh wrap-anywhere whitespace-break-spaces"
                      >
                        {words(line)}
                      </div>
                    ))}
                  </div>
                  {/* a stacking context keeps popovers like Twoslash's under the arm; the window
                   the press shows its page through, over the source */}
                  <div data-out className="isolate">
                    {/* its code wraps, so no line is cut by its plate */}
                    <div className="prose h-full bg-lp-paper [&_.twoslash-completion-list]:w-max! [&_.twoslash-completion-list]:select-text! [&_pre]:w-full [&_pre]:wrap-anywhere [&_pre]:whitespace-pre-wrap [&>:first-child]:mt-0 [&>:last-child]:mb-0">
                      {slot}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div
              data-bay
              className="relative max-md:hidden md:col-span-2 md:row-start-2 md:border-y md:border-lp-line"
              style={{ height: BED.height }}
            >
              {bed}
            </div>
          </div>
        </Window>
        <div data-bay-phone className="relative w-18 shrink-0 md:hidden">
          {column}
        </div>
        {/* paper over the block being typed, from the caret on */}
        <div
          data-veil
          aria-hidden
          className="pointer-events-none invisible absolute overflow-clip *:absolute *:inset-0 *:bg-lp-paper"
        >
          <span />
          <span />
        </div>
        {/* paper dithered over the page before it is written again; the line her pencil drags */}
        <div
          data-cover
          aria-hidden
          className="pointer-events-none invisible absolute z-1 bg-lp-paper"
        />
        <span
          data-scan
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-1 h-px bg-lp-ink"
        />
        <span
          data-caret
          aria-hidden
          className={`pointer-events-none invisible absolute top-0 left-0 h-lh w-[1ch] bg-lp-ink motion-reduce:animate-none ${SOURCE}`}
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
