'use client';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { whenSeen } from '../../lib/later';
import { report } from '../../lib/status';
import { CORE, LAYERS, OPTIONS, type SwapLayer } from './data';
import { createStack, type StackEngine } from './engine';
import { Front } from './front';
import { CodeWindow, Crossfade, HEADLESS, Keys, type Picks, type Snippets } from './panel';
import './parts.css';

interface StageProps {
  /** the figure's title and description, their parts marked `data-rise` */
  header: ReactNode;
  /** a docs page in Fumadocs UI, and the same page with the UI swapped for your own */
  page: ReactNode;
  headless: ReactNode;
  snippets: Snippets;
}

const initial: Picks = { ui: 0, content: 0, framework: 0 };

/**
 * The page as the top of a stack of layers, one per library: the camera lifts off the page as the
 * reader scrolls and finds the stack under it (`engine.ts`). The page and the layers' fronts are
 * real DOM on the faces of WebGL solids. A pick slides its layer out, it takes the new module and
 * goes back in, and the code window shows that option's real setup.
 */
export function Stage({ header, page, headless, snippets }: StageProps) {
  const [picks, setPicks] = useState<Picks>(initial);
  const [shown, setShown] = useState<Picks>(initial);
  const [last, setLast] = useState<SwapLayer>('content');
  const engine = useRef<StackEngine | null>(null);

  const land = useCallback((root: Element, layer: SwapLayer, option: number) => {
    setShown((prev) => ({ ...prev, [layer]: option }));
    setLast(layer);
    report(root, `${layer}: ${OPTIONS[layer][option].title}`);
  }, []);

  const ref = useCallback(
    (root: HTMLDivElement | null) => {
      if (!root) return;
      // the WebGL context and its shader are made a viewport ahead, so they are ready when it shows
      const stopView = whenSeen(
        root,
        () => {
          engine.current = createStack(root, {
            onLand: (layer, option) => land(root, layer, option),
          });
        },
        { rootMargin: '100% 0px' },
      );
      return () => {
        stopView();
        engine.current?.destroy();
        engine.current = null;
      };
    },
    [land],
  );

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
    fronts.push(
      <div key={layer} data-front={layer} className="parts-front group/tray">
        <Front layer={layer} title={info.title} name={info.name} />
      </div>,
    );
  }

  return (
    <div ref={ref} className="parts-pin">
      <div className="parts-stage">
        <div data-head className="parts-head @container">
          {header}
        </div>
        <div data-cell className="parts-cell">
          <div data-page className="parts-page @container">
            <Crossfade
              className="size-full"
              shown={shown.ui === HEADLESS ? 'headless' : 'page'}
              render={(key) => (key === 'headless' ? headless : page)}
            />
          </div>
          {fronts}
          <canvas aria-hidden className="pointer-events-none absolute inset-0 size-full" />
        </div>
        <div data-slot aria-hidden className="parts-slot" />
        <div data-panel className="parts-panel flex flex-col gap-4">
          <div className="@container">
            <Keys picks={picks} onPick={pick} />
          </div>
          <CodeWindow
            layer={last}
            option={shown[last]}
            headless={shown.ui === HEADLESS}
            snippets={snippets}
          />
        </div>
      </div>
      <div data-run aria-hidden className="parts-run" />
    </div>
  );
}
