'use client';
import { type CSSProperties, type ReactNode, useCallback, useRef, useState } from 'react';
import { whenSeen } from '../../lib/later';
import { report } from '../../lib/status';
import type { Layer } from '../../ui/chip';
import { DitherSwap } from '../../ui/dither';
import { CORE, LAYERS, NAMES, OPTIONS, type SwapLayer } from './data';
import { createStack, type StackEngine } from './engine';
import { Front } from './front';
import { CodeWindow, type Picks, Selects, type Snippets } from './panel';
import { POSE } from './scene';
import './parts.css';

interface StageProps {
  /** the figure's title */
  header: ReactNode;
  /** a docs page in Fumadocs UI, and the same page with the UI swapped for your own */
  page: ReactNode;
  headless: ReactNode;
  snippets: Snippets;
}

const initial: Picks = { ui: 0, content: 0, framework: 0 };

/**
 * The real page on a stack of layers, one per library, each a key (`engine.ts`): a press swaps its
 * module for the next. Beside it, a select per layer picks one outright, and the code window shows
 * the setup of the last swap, starting with the content.
 */
export function Stage({ header, page, headless, snippets }: StageProps) {
  // the options in use, which a press on the stack reads, and in state to render
  const picks = useRef<Picks>(initial);
  const [shown, setShown] = useState<Picks>(initial);
  const [last, setLast] = useState<SwapLayer>('content');
  /** what a screen reader hears after a press */
  const [said, setSaid] = useState('');
  const engine = useRef<StackEngine | null>(null);
  const figure = useRef<HTMLDivElement | null>(null);

  const tell = useCallback((layer: Layer, title: string, line: string) => {
    setSaid(line);
    if (figure.current) report(figure.current, `${layer}: ${title}`);
  }, []);

  const choose = useCallback(
    (layer: SwapLayer, option: number) => {
      picks.current = { ...picks.current, [layer]: option };
      setShown(picks.current);
      setLast(layer);
      const { title } = OPTIONS[layer][option];
      tell(layer, title, `${NAMES[layer]}: ${title}`);
      engine.current?.press(layer);
    },
    [tell],
  );

  /** a layer pressed on the stack takes its next option; the core is bolted in */
  const press = useCallback(
    (layer: Layer) => {
      if (layer !== 'core') {
        choose(layer, (picks.current[layer] + 1) % OPTIONS[layer].length);
        return;
      }
      tell(layer, CORE.title, `${NAMES.core}: ${CORE.title}, fixed`);
      engine.current?.press(layer);
    },
    [choose, tell],
  );

  const ref = useCallback(
    (root: HTMLDivElement | null) => {
      figure.current = root;
      if (!root) return;
      // the WebGL context is made a screen ahead, so it's ready when the stack shows
      const stop = whenSeen(
        root,
        () => {
          engine.current = createStack(root, press);
        },
        { rootMargin: '100% 0px' },
      );
      return () => {
        stop();
        engine.current?.destroy();
        engine.current = null;
      };
    },
    [press],
  );

  const fronts: ReactNode[] = [];
  for (const layer of LAYERS) {
    fronts.push(
      layer === 'core' ? (
        <Front key={layer} layer={layer} title={CORE.title} option={0} count={0} active={false} />
      ) : (
        <Front
          key={layer}
          layer={layer}
          title={OPTIONS[layer][shown[layer]].title}
          option={shown[layer]}
          count={OPTIONS[layer].length}
          active={layer === last}
        />
      ),
    );
  }
  const isHeadless = OPTIONS.ui[shown.ui].headless === true;

  return (
    <div ref={ref} className="parts">
      <div className="parts-row">
        <div className="parts-stack">
          {header}
          <div data-cell className="parts-cell" style={{ '--stack': POSE.aspect } as CSSProperties}>
            <div data-page inert aria-hidden className="parts-face parts-page">
              <DitherSwap swapKey={isHeadless ? 'headless' : 'page'} opaque className="size-full">
                {isHeadless ? headless : page}
              </DitherSwap>
            </div>
            {fronts}
            <canvas aria-hidden className="pointer-events-none absolute inset-0 size-full" />
          </div>
          <p aria-live="polite" className="sr-only">
            {said}
          </p>
        </div>
        <div className="parts-panel">
          <Selects picks={shown} onPick={choose} />
          <CodeWindow layer={last} option={shown[last]} headless={isHeadless} snippets={snippets} />
        </div>
      </div>
    </div>
  );
}
