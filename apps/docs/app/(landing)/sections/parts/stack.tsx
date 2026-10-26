'use client';
import { type CSSProperties, memo, type ReactNode, useCallback, useRef, useState } from 'react';
import { DITHER_MASKS } from '../../lib/bayer';
import { report } from '../../lib/status';
import { Roller } from '../../ui/roller';
import { Chip, type Layer } from '../../ui/spec';
import { cn } from '@/lib/cn';
import { createStack, type StackEngine } from './engine';
import { NARROW, restCss, roomOf, type Scene, SHADOW, WIDE } from './geometry';
import { Bolt, Hazard, Latch, Pins, Rivets, Screw, Socket } from './hardware';
import { CORE, type Holds as HoldsInfo, LAYERS, OPTIONS, type SwapLayer } from './data';
import { CodeWindow, Crossfade, HEADLESS, Keys, type Picks, type Snippets } from './panel';

/** a page in Fumadocs UI at a desktop's width and at a phone's */
interface Faces {
  wide: ReactNode;
  narrow: ReactNode;
}

interface StackProps {
  page: Faces;
  /** the same page with the UI swapped for your own */
  headless: Faces;
  snippets: Snippets;
}

/** a scene's sizes as CSS variables, `key` naming the width they are for */
function sceneVars(scene: Scene, key: string) {
  return {
    [`--${key}-w`]: `${scene.width}px`,
    [`--${key}-h`]: `${scene.height}px`,
    [`--${key}-t`]: `${scene.tray}px`,
    [`--${key}-g`]: `${scene.gap}px`,
    [`--${key}-f`]: `${scene.frame}px`,
  };
}

/** the camera's first frame and the canvas' aspect, with the stack above the panel or beside it */
function restVars(scene: Scene, key: string, beside: boolean) {
  const rest = restCss(scene, roomOf(beside));
  return { [`--${key}-cam`]: rest.css, [`--${key}-aspect`]: rest.aspect };
}

/** the stack's units for each width, the camera's first frame among them */
const units = {
  ...sceneVars(NARROW, 'n'),
  ...restVars(NARROW, 'n', false),
  ...sceneVars(WIDE, 'w'),
  ...restVars(WIDE, 'w', false),
  ...restVars(WIDE, 'l', true),
  '--shade': DITHER_MASKS[12],
  '--shade-dark': DITHER_MASKS[5],
  '--frame': DITHER_MASKS[8],
  '--frame-dark': DITHER_MASKS[4],
} as CSSProperties;

/** the narrow scene's units, the wide one's from the engine's breakpoints up */
const sizes =
  'aspect-(--n-aspect) [--cam:var(--n-cam)] [--f:var(--n-f)] [--g:var(--n-g)] [--h:var(--n-h)] [--t:var(--n-t)] [--w:var(--n-w)] sm:aspect-(--w-aspect) sm:[--cam:var(--w-cam)] sm:[--f:var(--w-f)] sm:[--g:var(--w-g)] sm:[--h:var(--w-h)] sm:[--t:var(--w-t)] sm:[--w:var(--w-w)] lg:aspect-(--l-aspect) lg:[--cam:var(--l-cam)]';

/** from a tray's top to the bottom of the stack, at rest */
const depth = 'calc(4 * var(--t) + 3 * var(--g))';

/** a tray's top below the page at rest, `index` trays down */
function down(index: number) {
  return `${index} * (var(--t) + var(--g))`;
}

/** the shaded side of a solid: ink through a dense dither, sparse on dark paper */
const shade =
  'bg-lp-ink [mask-image:var(--shade)] [mask-size:6px_6px] dark:[mask-image:var(--shade-dark)]';

/** the frame's side, lighter than a tray's so its rails read on it */
const frameShade =
  'bg-lp-ink [mask-image:var(--frame)] [mask-size:6px_6px] dark:[mask-image:var(--frame-dark)]';

/** a solid part, edge on and hidden while the camera looks at the page straight on */
const solid = 'group-data-flat/stack:invisible';

const initial: Picks = { ui: 0, content: 0, framework: 0 };

/**
 * The page as the top of a stack of trays, one per layer, in CSS 3D: real DOM on the faces, toon
 * sides, a frame down the left with the rails the trays slide on, the pins where each layer plugs
 * into the next. A pick unlatches its tray, slides it out to take the new module and back in,
 * and the code window beside it shows that option's real setup.
 */
export function Stack({ page, headless, snippets }: StackProps) {
  const [picks, setPicks] = useState<Picks>(initial);
  const [shown, setShown] = useState<Picks>(initial);
  const [last, setLast] = useState<SwapLayer>('content');
  const engine = useRef<StackEngine | null>(null);

  const ref = useCallback((root: HTMLDivElement | null) => {
    if (!root) return;
    const current = createStack(root, {
      onLand(layer, option) {
        setShown((prev) => ({ ...prev, [layer]: option }));
        setLast(layer);
        report(root, `${layer}: ${OPTIONS[layer][option].title}`);
      },
    });
    engine.current = current;
    return () => {
      current.destroy();
      engine.current = null;
    };
  }, []);

  const pick = useCallback((layer: SwapLayer, option: number) => {
    setPicks((prev) => ({ ...prev, [layer]: option }));
    engine.current?.want(layer, option);
  }, []);

  const trays: ReactNode[] = [];
  // bottom up, so the painter's order matches the depth order
  for (let index = LAYERS.length - 1; index >= 0; index--) {
    const layer = LAYERS[index];
    trays.push(
      <Tray
        key={layer}
        layer={layer}
        index={index}
        option={layer === 'core' ? 0 : shown[layer as SwapLayer]}
        page={page}
        headless={headless}
      />,
    );
  }

  return (
    <div
      ref={ref}
      className="group/stack grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-x-12"
    >
      <div data-canvas="" className={cn('relative [container-type:size]', sizes)} style={units}>
        <div
          data-camera=""
          className="absolute top-0 left-0 h-(--h) w-(--w) origin-top-left transform-(--cam) transform-3d"
        >
          <div
            aria-hidden
            data-shadow=""
            className={cn('absolute inset-0 bg-lp-line-strong [mask-size:12px_12px]', solid)}
            style={{
              maskImage: DITHER_MASKS[4],
              transform: `translate3d(${SHADOW.x}px, ${SHADOW.y}px, calc(-1 * ${depth} - 1px))`,
            }}
          />
          <Frame />
          {trays}
        </div>
      </div>
      {/* the keys as far from the window as its code is from its frame */}
      <div className="flex flex-col gap-4 @container">
        <Keys picks={picks} onPick={pick} />
        <CodeWindow
          layer={last}
          option={shown[last]}
          headless={shown.ui === HEADLESS}
          snippets={snippets}
        />
      </div>
    </div>
  );
}

/**
 * The frame down the left of the stack, its side to the camera, and a rail screwed to it for each
 * tray, whose end shows on its front edge as the channel the tray's runner rides in. The faces
 * keep the stack's depth at rest and the rails stand at their trays' depths, so as the trays part
 * the camera only moves them.
 */
function Frame() {
  const rails: ReactNode[] = [];
  for (let i = 0; i < LAYERS.length; i++) {
    rails.push(
      <div
        key={i}
        data-rail=""
        className="absolute inset-0 transform-3d"
        style={{ transform: `translate3d(0, 0, calc(-1 * ${down(i)}))` }}
      >
        {/* a hair outside the frame's faces, so the camera never sorts them as one plane */}
        <div
          className="absolute top-0 left-[calc(-1*(var(--f)+var(--t))-1px)] h-(--h) w-(--t) origin-right"
          style={{ transform: 'rotateY(-90deg)' }}
        >
          <span className="absolute inset-y-[4%] left-1/2 w-[18px] -translate-x-1/2 border-x-[1.5px] border-lp-ink bg-lp-paper-2">
            <Screw angle={30 + i * 50} className="top-[8%] left-1/2" />
            <Screw angle={-20 + i * 35} className="top-1/2 left-1/2" />
            <Screw angle={70 - i * 25} className="top-[92%] left-1/2" />
          </span>
        </div>
        <div
          className="absolute left-[calc(-1*var(--f))] h-(--t) w-(--f) origin-top"
          style={{ top: 'calc(var(--h) + 1px)', transform: 'rotateX(-90deg)' }}
        >
          <span className="absolute top-1/2 left-1/2 flex h-5 w-4 -translate-1/2 justify-center border-[1.5px] border-lp-ink bg-lp-ink">
            <span className="w-1.5 bg-lp-paper-2" />
          </span>
        </div>
      </div>,
    );
  }

  return (
    <div aria-hidden className={cn('absolute inset-0 transform-3d', solid)}>
      <div
        data-frame="side"
        className="absolute top-0 h-(--h) origin-right border-[1.5px] border-lp-ink bg-lp-paper"
        style={{
          left: `calc(-1 * (var(--f) + ${depth}))`,
          width: depth,
          transform: 'rotateY(-90deg)',
        }}
      >
        <div className={cn('absolute inset-0', frameShade)} />
      </div>
      <div
        data-frame="front"
        className="absolute left-[calc(-1*var(--f))] w-(--f) origin-top border-[1.5px] border-lp-ink bg-lp-paper-2"
        style={{ top: 'var(--h)', height: depth, transform: 'rotateX(-90deg)' }}
      />
      <div className="absolute top-0 left-[calc(-1*var(--f))] h-(--h) w-(--f) border-[1.5px] border-lp-ink bg-lp-paper-2">
        <Screw angle={40} className="top-[6%] left-1/2" />
        <Screw angle={-25} className="top-[94%] left-1/2" />
      </div>
      {rails}
    </div>
  );
}

const Tray = memo(function Tray({
  layer,
  index,
  option,
  page,
  headless,
}: {
  layer: Layer;
  index: number;
  option: number;
  page: Faces;
  headless: Faces;
}) {
  const info = layer === 'core' ? CORE : OPTIONS[layer as SwapLayer][option];
  const holds = info.holds;
  let top: ReactNode;
  if (layer === 'ui') {
    top = (
      <Crossfade
        shown={option === HEADLESS ? 'headless' : 'page'}
        render={(key) => <Face {...(key === 'headless' ? headless : page)} />}
      />
    );
  } else {
    top = (
      <>
        <div className="absolute inset-0 lp-dots opacity-50" />
        {holds && (
          // under the tray above unless this one is out
          <div className="invisible absolute inset-x-8 bottom-[52px] group-data-open/tray:visible sm:inset-x-12 sm:bottom-[72px]">
            <Crossfade shown={info.name} render={() => <Holds holds={holds} />} />
          </div>
        )}
      </>
    );
  }

  return (
    <div
      data-tray={layer}
      className="group/tray absolute inset-0 transform-3d"
      style={{ transform: `translate3d(0, 0, calc(-1 * ${down(index)}))` }}
    >
      <div
        className={cn(
          'absolute inset-0 overflow-hidden',
          layer === 'ui' ? 'bg-fd-background' : 'bg-lp-paper',
        )}
      >
        {top}
        {/* clear of what the tray holds, which slides out under the pins of the tray above */}
        {index > 0 && <Socket className={cn('right-10 bottom-1 sm:right-[196px]', solid)} />}
        {/* its edge over the page, which fills the whole top */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-2 border-[1.5px] border-lp-ink"
        />
      </div>
      <div
        className={cn(
          'absolute left-0 h-(--t) w-full origin-top border-[1.5px] border-lp-ink bg-lp-paper',
          solid,
        )}
        style={{ top: 'var(--h)', transform: 'rotateX(-90deg)' }}
      >
        <Front layer={layer} title={info.title} name={info.name} />
      </div>
      <div
        aria-hidden
        className={cn(
          'absolute top-0 left-[calc(-1*var(--t))] h-(--h) w-(--t) origin-right border-[1.5px] border-lp-ink',
          solid,
        )}
        style={{ transform: 'rotateY(-90deg)' }}
      >
        <div className={cn('absolute inset-0', shade)} />
        {/* the runner it slides on, along the frame's rail */}
        <span className="absolute inset-y-0 left-1/2 w-3.5 -translate-x-1/2 border-x-[1.5px] border-lp-ink bg-lp-paper-2" />
      </div>
      {index < LAYERS.length - 1 && (
        <Pins
          className={cn('right-11 h-(--g) w-[128px] origin-top sm:right-[200px]', solid)}
          style={{
            top: 'calc(var(--h) - 26px)',
            transform: 'translateZ(calc(-1 * var(--t))) rotateX(-90deg)',
          }}
        />
      )}
    </div>
  );
});

function Face({ wide, narrow }: Faces) {
  return (
    <>
      <div className="max-sm:hidden">{wide}</div>
      <div className="sm:hidden">{narrow}</div>
    </>
  );
}

/**
 * A tray's front: its layer stencilled on the left, the module on a riveted nameplate that rolls
 * when it changes and lights up while the tray is out, and what holds the tray in: a latch, or
 * the core's bolts.
 */
function Front({ layer, title, name }: { layer: Layer; title: string; name: string }) {
  return (
    <div className="relative flex h-full items-center gap-3 px-7 sm:gap-6 sm:px-12">
      <Screw angle={35} className="top-1/2 left-3.5 sm:left-6" />
      <Screw angle={-50} className="top-1/2 right-3.5 translate-x-1/2 sm:right-6" />
      <Chip
        layer={layer}
        className="h-10 w-[180px] shrink-0 gap-3 border-0 bg-transparent px-0 text-[26px] max-sm:hidden [&_svg]:size-[18px]"
      />
      <span className="relative flex h-[52px] min-w-0 flex-1 sm:max-w-[520px]">
        {/* the stamp's second strike, a hair off its line */}
        <span
          aria-hidden
          className="absolute inset-0 translate-[3px] border-[1.5px] border-lp-ink-2"
        />
        <span className="relative flex min-w-0 flex-1 flex-col justify-center border-[1.5px] border-lp-ink bg-lp-paper-2 px-7 group-data-open/tray:bg-lp-yellow group-data-open/tray:text-[#121210] sm:px-8">
          <span className="font-pixel text-[22px] leading-none sm:text-[26px]">
            <Roller value={title} />
          </span>
          <span className="mt-1.5 truncate font-mono text-[13px] leading-none text-lp-ink-2 group-data-open/tray:text-[#121210] max-sm:hidden sm:text-[15px]">
            {name}
          </span>
          <Chip
            layer={layer}
            className="mt-1.5 h-auto gap-1.5 border-0 bg-transparent px-0 text-[15px] text-lp-ink-2 group-data-open/tray:text-[#121210] sm:hidden [&_svg]:size-3"
          />
          <Rivets count={2} className="absolute inset-y-1.5 right-1.5 flex-col" />
        </span>
      </span>
      {layer === 'core' ? (
        // bolted in, never swapped
        <span aria-hidden className="relative ms-auto flex h-full w-[60px] shrink-0 sm:w-[104px]">
          <Hazard className="inset-x-0 inset-y-2 border-[1.5px] border-lp-ink-2" />
          <Bolt angle={15} className="top-1/2 left-[25%]" />
          <Bolt angle={-20} className="top-1/2 left-[75%]" />
        </span>
      ) : (
        <Latch className="ms-auto max-sm:w-[60px]" />
      )}
    </div>
  );
}

function Holds({ holds }: { holds: HoldsInfo }) {
  const items: ReactNode[] = [];
  for (const item of holds.items) {
    items.push(
      <li
        key={item}
        className="flex h-12 items-center gap-3 border-[1.5px] border-lp-ink bg-lp-paper px-7 font-mono text-[19px] whitespace-nowrap sm:h-14 sm:text-[20px]"
      >
        <span aria-hidden className="size-4 shrink-0 border-[1.5px] border-lp-ink bg-lp-paper-2" />
        {item}
      </li>,
    );
  }
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <p className="font-mono text-[19px] text-lp-ink-2 sm:text-[20px]">{holds.root}</p>
      {/* on a phone, the first page is enough to show where they live */}
      <ul className="flex flex-wrap gap-3 max-sm:[&>li:nth-child(n+2)]:hidden">{items}</ul>
    </div>
  );
}
