'use client';
import { type ReactNode, useCallback, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { Window } from '../../ui/window';
import { createPlayer, type Player } from './player';
import { fileLines, type Step, tokenize } from './steps';

const TONES = ['text-lp-ink', 'text-lp-ink-2', 'text-lp-orange'];

export interface ScreenProps {
  steps: Step[];
  /** the raw source of each step */
  sources: string[];
  /** the compiled output of each step */
  slots: ReactNode[];
  toc: ReactNode;
}

/**
 * The editor and the page on one screen. The server renders the finished page beside its full
 * source; once the stage is in view, the player writes it again, step by step.
 */
export function Screen({ steps, sources, slots, toc }: ScreenProps) {
  const lines = fileLines(sources);
  const end = lines[lines.length - 1];
  const player = useRef<Player | null>(null);
  // a refreshed server render sends the same content in new arrays, only new content restarts
  const content = JSON.stringify([steps, sources]);
  const ref = useCallback(
    (stage: HTMLDivElement | null) => {
      if (!stage) return;
      // reduced motion keeps the finished drawing, balloons included
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const instance = createPlayer(stage, steps, fileLines(sources), still);
      player.current = instance;
      return () => {
        instance.destroy();
        player.current = null;
      };
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [content],
  );

  return (
    <div ref={ref} className="relative flex flex-col px-(--lp-gutter) pb-(--lp-gutter) lg:flex-row">
      <Window
        data-editor
        title="quick-start.mdx"
        actions={
          <span
            data-cursor
            // a fixed width, so the title never shifts as the numbers grow
            className="relative box-content inline-block w-[5ch] bg-lp-paper px-1.5 text-end font-mono text-[11px] leading-none text-lp-ink-2 tabular-nums"
          >
            {lines.length}:{end.text.length + 1}
          </span>
        }
        className="shrink-0 lg:w-[352px] xl:w-[540px]"
      >
        <div
          data-code
          className="relative flex-1 overflow-hidden py-3 font-mono text-[11px] leading-[15px] [counter-reset:line] [font-variant-ligatures:none] lg:leading-4 xl:text-[13px] xl:leading-5"
        >
          {lines.map((line, i) => (
            // line numbers are counters, so copying the code leaves them out
            <div
              key={i}
              data-line
              className="flex [counter-increment:line] before:w-10 before:shrink-0 before:pe-3 before:text-end before:text-lp-ink-2 before:tabular-nums before:content-[counter(line)] data-flying:opacity-30 xl:before:w-12 xl:before:pe-4"
            >
              <span
                data-text
                className="whitespace-pre data-selected:bg-lp-yellow data-selected:**:text-[#121210]"
              >
                {tokenize(line.text).map(([text, tone], j) => (
                  <span key={j} className={TONES[tone]}>
                    {text}
                  </span>
                ))}
              </span>
            </div>
          ))}
          <span
            data-caret
            aria-hidden
            className="lp-caret absolute top-3 left-10 h-[15px] w-[1ch] bg-lp-ink lg:h-4 xl:left-12 xl:h-5"
            style={{ transform: `translate(${end.text.length}ch, ${lines.length - 1}lh)` }}
          />
        </div>
      </Window>
      <div data-channel className="h-10 shrink-0 lg:h-auto lg:w-[120px]" />
      <Window
        data-page
        title="localhost:3000/docs/quick-start"
        actions={
          <button
            type="button"
            onClick={() => player.current?.replay()}
            className="relative inline-flex h-6 items-center gap-1 bg-lp-paper px-1.5 font-pixel text-[11px] leading-none text-lp-ink-2 transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none motion-reduce:hidden [@media(scripting:none)]:hidden"
          >
            <RotateCcw aria-hidden className="size-3" />
            replay
          </button>
        }
        className="min-w-0 flex-1"
      >
        {/* the page zoomed out like a browser, so the whole of it fits beside its source; its own
        stacking context keeps popovers like Twoslash's under the canvas */}
        <div
          data-zoom
          className="isolate grid gap-6 px-6 pt-8 pb-10 [zoom:0.78] xl:[zoom:0.8] min-[1400px]:grid-cols-[minmax(0,1fr)_140px] [&_.twoslash-completion-list]:select-text! max-lg:[&_.twoslash-completion-list]:w-60!"
        >
          <div className="min-w-0">
            <div data-slot>{slots[0]}</div>
            <div className="prose mt-6">
              {slots.slice(1).map((slot, i) => (
                <div key={i} data-slot>
                  {slot}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 max-[1399px]:hidden">{toc}</div>
        </div>
      </Window>
      <svg
        data-drawing
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full overflow-visible fill-none stroke-lp-line-strong"
      >
        {steps.map((step) => (
          // a leader drawn like a pen: its source bracket opens from the middle, the line runs
          // into the balloon and out to the slot, whose bracket opens
          <g key={step.kind} data-pen style={{ visibility: 'hidden' }}>
            {[0, 1, 2, 3, 4, 5].map((part) => (
              <path key={part} pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
            ))}
          </g>
        ))}
        {steps.map((step) => (
          // where a step's output lands, until it comes in
          <g key={step.kind} data-frame style={{ visibility: 'hidden' }}>
            <rect className="stroke-lp-ink" strokeDasharray="3 3" />
            <text className="fill-lp-ink stroke-none font-pixel text-[11px]">{step.label}</text>
          </g>
        ))}
      </svg>
      <div data-marks aria-hidden className="pointer-events-none absolute inset-0">
        {steps.map((step) => (
          // a balloon names the kind of its block
          <span
            key={step.kind}
            data-balloon
            className="absolute top-0 left-0 inline-flex h-6 items-center rounded-full border border-lp-line-strong bg-lp-paper px-2 font-pixel text-[11px] leading-none whitespace-nowrap"
            style={{ visibility: 'hidden' }}
          >
            {step.kind}
          </span>
        ))}
      </div>
      {/* the glyphs and the dither covers, over everything they cross */}
      <canvas
        data-sand
        aria-hidden
        className="pointer-events-none invisible absolute inset-0 size-full"
      />
    </div>
  );
}
