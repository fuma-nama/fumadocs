'use client';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { whenSeen } from '../../lib/later';
import { report } from '../../lib/status';
import { DitherSwap } from '../../ui/dither';
import { CORE, HEADLESS, LAYERS, OPTIONS, type SwapLayer } from './data';
import { createStack, type StackEngine } from './engine';
import { Front } from './front';
import { CodeWindow, Keys, type Picks, type Snippets } from './panel';
import './parts.css';

interface StageProps {
  /** the figure's title and description, in an element marked `data-rise-group` */
  header: ReactNode;
  /** a docs page in Fumadocs UI, and the same page with the UI swapped for your own */
  page: ReactNode;
  headless: ReactNode;
  snippets: Snippets;
}

const initial: Picks = { ui: 0, content: 0, framework: 0 };

/**
 * The page on top of a stack of layers, one per library, that the camera finds as the reader
 * scrolls (`engine.ts`); a pick slides its layer's tray out to take the new module.
 */
export function Stage({ header, page, headless, snippets }: StageProps) {
  const [picks, setPicks] = useState<Picks>(initial);
  const [shown, setShown] = useState<Picks>(initial);
  const [last, setLast] = useState<SwapLayer>('content');
  const engine = useRef<StackEngine | null>(null);

  const ref = useCallback((root: HTMLDivElement | null) => {
    if (!root) return;
    // the WebGL context and its shader are made a viewport ahead, so they are ready when it shows
    const stopView = whenSeen(
      root,
      () => {
        engine.current = createStack(root, (layer, option) => {
          setShown((prev) => ({ ...prev, [layer]: option }));
          setLast(layer);
          report(root, `${layer}: ${OPTIONS[layer][option].title}`);
        });
      },
      { rootMargin: '100% 0px' },
    );
    return () => {
      stopView();
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);

  const pick = useCallback((layer: SwapLayer, option: number) => {
    setPicks((prev) => ({ ...prev, [layer]: option }));
    if (engine.current) engine.current.want(layer, option);
    else {
      setShown((prev) => ({ ...prev, [layer]: option }));
      setLast(layer);
    }
  }, []);

  const fronts: ReactNode[] = [];
  for (const layer of LAYERS) {
    const info = layer === 'core' ? CORE : OPTIONS[layer][shown[layer]];
    fronts.push(<Front key={layer} layer={layer} title={info.title} name={info.name} />);
  }
  const isHeadless = shown.ui === HEADLESS;

  const code = (
    <CodeWindow layer={last} option={shown[last]} headless={isHeadless} snippets={snippets} />
  );

  return (
    <>
      {/* the figure takes focus when the panel goes from under it */}
      <div ref={ref} tabIndex={-1} className="parts-pin outline-none">
        <div className="parts-stage">
          <div data-head className="parts-head @container">
            {header}
          </div>
          <div data-cell className="parts-cell">
            <div data-page className="parts-page @container">
              <DitherSwap swapKey={isHeadless ? 'headless' : 'page'} opaque className="size-full">
                {isHeadless ? headless : page}
              </DitherSwap>
            </div>
            {fronts}
            <canvas aria-hidden className="pointer-events-none absolute inset-0 size-full" />
          </div>
          <div data-slot aria-hidden className="parts-slot" />
          <div data-panel className="parts-panel flex flex-col gap-4">
            <div className="@container">
              <Keys picks={picks} onPick={pick} />
            </div>
            {code}
          </div>
        </div>
        <div data-run aria-hidden className="parts-run" />
      </div>
      {/* a phone's stage has room for the keys alone: its code window follows the stage */}
      <div className="parts-after">{code}</div>
    </>
  );
}
