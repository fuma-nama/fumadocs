'use client';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Lead } from '../../ui/figure';
import { copy } from '../../content';
import { report } from '../../lib/status';
import { cn } from '@/lib/cn';
import { STATUS } from './data';
import { PAGE, PERSPECTIVE, planTransformCss } from './camera';
import { Block } from './drawers';
import {
  CodeWindow,
  Keys,
  type Snippets,
  type Swap,
  type SwapActions,
  type SwapLayer,
} from './swap';
import { Labels } from './labels';
import { createTrack, HOLDS, type Track, TRACK } from './track';

interface StageProps {
  swap: Swap;
  actions: SwapActions;
  /** the page in Fumadocs UI, its code block highlighted on the server */
  page: ReactNode;
  snippets: Snippets;
}

/**
 * The figure on large screens, pinned to the scroll: the page straight on with its parts named,
 * then the camera swings round to show it is the top of a block of drawers, one per layer, on the
 * framework as its base. The keys swap a layer: its drawer comes out, takes the new module and
 * goes back in, and nothing else moves.
 */
export function Stage({ swap, actions, page, snippets }: StageProps) {
  const track = useRef<Track | null>(null);
  const [beat, setBeat] = useState(0);

  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const current = createTrack(element, {
        onBeat(next) {
          setBeat(next);
          report(element, STATUS[next]);
        },
        onLand: actions.land,
        onBack() {
          actions.reset('ui');
          current.reset('ui', 0);
        },
      });
      track.current = current;
      return () => {
        current.destroy();
        track.current = null;
      };
    },
    [actions],
  );

  const pick = useCallback(
    (layer: SwapLayer, option: number) => {
      actions.pick(layer, option);
      track.current?.want(layer, option);
    },
    [actions],
  );

  const holds: ReactNode[] = [];
  for (let i = 0; i < HOLDS.length; i++) {
    holds.push(
      <span
        key={i}
        id={`parts-${i + 1}`}
        aria-hidden
        className="absolute scroll-mt-(--lp-menu-h)"
        style={{ top: `${HOLDS[i] * TRACK.length * 100}svh` }}
      />,
    );
  }

  return (
    <div
      ref={ref}
      className="relative"
      style={{
        height: `calc(100svh - var(--lp-menu-h) - var(--lp-status-h) + ${TRACK.length * 100}svh)`,
      }}
    >
      <div
        data-stage=""
        className="sticky top-(--lp-menu-h) flex h-[calc(100svh-var(--lp-menu-h)-var(--lp-status-h))] flex-col overflow-hidden pt-6 pb-6"
      >
        <Header beat={beat} />
        <div
          data-canvas=""
          className="relative mx-(--lp-gutter) mt-4 min-h-0 flex-1 [container-type:size] [--code:min(552px,40%)]"
        >
          <div className="absolute inset-0" style={{ perspective: PERSPECTIVE }}>
            <div
              data-camera=""
              className="absolute top-0 left-0 origin-top-left transform-3d"
              style={{ width: PAGE.width, height: PAGE.height, transform: planTransformCss() }}
            >
              <Block swap={swap} page={page} snippets={snippets} />
              <Labels />
            </div>
          </div>
          <div
            data-code=""
            className="pointer-events-none absolute top-0 right-0 w-(--code) opacity-0"
          >
            <CodeWindow
              layer={swap.last}
              option={swap.shown[swap.last]}
              snippets={snippets}
              className="[&_pre]:w-full [&_pre]:wrap-anywhere [&_pre]:whitespace-pre-wrap"
            />
          </div>
          <div
            data-keys=""
            className="pointer-events-none absolute right-[calc(var(--code)+32px)] bottom-0 left-0 opacity-0"
          >
            <Keys picks={swap.picks} onPick={pick} />
          </div>
        </div>
      </div>
      {holds}
    </div>
  );
}

/**
 * The title: the lead, then the three beats as its lines, the current one in ink. Each line
 * links to where its beat holds; the descriptions share one box, the size of the longest.
 */
function Header({ beat }: { beat: number }) {
  const { beats } = copy.parts;
  function line(i: number) {
    return (
      <a
        href={`#parts-${i + 1}`}
        aria-current={i === beat ? 'step' : undefined}
        className={i === beat ? 'text-lp-ink' : 'text-lp-ink-2 hover:text-lp-ink'}
      >
        {beats[i].title}
      </a>
    );
  }

  const descriptions: ReactNode[] = [];
  for (let i = 0; i < beats.length; i++) {
    descriptions.push(
      <p
        key={beats[i].title}
        className={cn('self-end', i !== beat && 'pointer-events-none opacity-0 select-none')}
      >
        {beats[i].description}
      </p>,
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end gap-x-12 px-(--lp-gutter)">
      <div className="flex flex-col text-[32px] leading-[1.1] font-medium tracking-[-0.03em] text-balance">
        <h2>
          <Lead>{copy.parts.lead}</Lead> {line(0)}
        </h2>
        <h3>{line(1)}</h3>
        <h3>{line(2)}</h3>
      </div>
      <div className="grid max-w-[46ch] text-base leading-relaxed text-pretty text-lp-ink-2 *:col-start-1 *:row-start-1">
        {descriptions}
      </div>
    </div>
  );
}
