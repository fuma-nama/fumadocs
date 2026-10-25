'use client';
import { memo, type ReactNode } from 'react';
import { DITHER_MASKS } from '../../lib/bayer';
import { Roller } from '../../ui/roller';
import { Chip, type Layer } from '../../ui/spec';
import { Window } from '../../ui/window';
import { cn } from '@/lib/cn';
import { DEPTH, DRAWERS, drawerZ, PAGE, PULL, SHADOW, TIERS } from './camera';
import { Crossfade, optionsOf, type Snippets, type Swap, type SwapLayer } from './swap';
import { HeadlessPreview } from './preview';

/** the shaded side of a solid: ink through a dense dither, sparse on dark paper */
const shade =
  'bg-lp-ink [mask-image:var(--shade)] [mask-size:8px_8px] dark:[mask-image:var(--shade-dark)]';
const shades = { '--shade': DITHER_MASKS[12], '--shade-dark': DITHER_MASKS[5] } as const;

interface BlockProps {
  swap: Swap;
  /** the page in Fumadocs UI, its code block highlighted on the server */
  page: ReactNode;
  snippets: Snippets;
}

/**
 * The page as the top of a solid block, in CSS 3D: a drawer per layer under it, on the framework
 * as its base. Real DOM on the faces, toon sides: a paper front with ink edges, the left side of
 * the case dithered. Each front names its layer and the module in it; a drawer comes out toward
 * the reader when it is swapped, and what it holds shows on its top face. Straight on, it is the
 * page alone: the solid parts start hidden, the camera shows them once it tilts.
 */
export function Block({ swap, page, snippets }: BlockProps) {
  const { picks, shown, swaps } = swap;
  const drawers: ReactNode[] = [];
  // bottom up, so the painter's order matches the depth order
  for (let index = DRAWERS.length - 1; index >= 0; index--) {
    const layer = DRAWERS[index];
    const option = layer === 'core' ? 0 : shown[layer as SwapLayer];
    let top: ReactNode = null;
    if (layer === 'ui') top = <PageFace option={option} page={page} />;
    // a drawer's file only shows once it is out: mounted from its first pick on
    else if (layer !== 'core' && (swaps > 0 || picks[layer as SwapLayer] !== option))
      top = <Contents layer={layer as SwapLayer} option={option} snippets={snippets} />;
    drawers.push(
      <Drawer key={layer} layer={layer} index={index} option={option}>
        {top}
      </Drawer>,
    );
  }

  return (
    <div className="absolute inset-0 transform-3d" style={shades}>
      <div
        aria-hidden
        data-solid=""
        className="invisible absolute inset-0 bg-lp-line-strong [mask-size:12px_12px]"
        style={{
          maskImage: DITHER_MASKS[4],
          transform: `translate3d(${SHADOW.x}px, ${SHADOW.y}px, ${-DEPTH - 1}px)`,
        }}
      />
      {/* the case: its left side covers the drawers', a drawer out shows its own past it */}
      <div
        aria-hidden
        data-solid=""
        className="invisible absolute top-0 origin-right border border-lp-ink"
        style={{
          left: -DEPTH - 2,
          width: DEPTH,
          height: PAGE.height,
          transform: 'rotateY(-90deg)',
        }}
      >
        <div className={cn('size-full', shade)} />
      </div>
      {drawers}
    </div>
  );
}

function Drawer({
  layer,
  index,
  option,
  children,
}: {
  layer: Layer;
  index: number;
  option: number;
  children: ReactNode;
}) {
  const tier = TIERS[layer];
  return (
    <div
      data-drawer={layer}
      className="absolute inset-0 transform-3d"
      style={{ transform: `translate3d(0, 0, ${drawerZ(index)}px)` }}
    >
      <div className="absolute inset-0 overflow-hidden bg-lp-paper">
        {children}
        <span
          aria-hidden
          // over the page's layers, which stack to crossfade
          className="pointer-events-none absolute inset-0 z-2 border border-lp-line-strong"
        />
      </div>
      <div
        data-solid=""
        className={cn(
          'invisible absolute left-0 w-full origin-top border border-lp-ink',
          layer === 'framework' ? 'bg-lp-paper-2' : 'bg-lp-paper',
        )}
        style={{ top: PAGE.height, height: tier, transform: 'rotateX(-90deg)' }}
      >
        <Front layer={layer} option={option} />
      </div>
      <div
        aria-hidden
        data-solid=""
        className="invisible absolute top-0 origin-right border border-lp-ink"
        style={{ left: -tier, width: tier, height: PAGE.height, transform: 'rotateY(-90deg)' }}
      >
        <div className={cn('size-full', shade)} />
      </div>
    </div>
  );
}

/**
 * A drawer's front: its layer, and the module in it on a nameplate that rolls when it changes.
 * Large on the block, which the camera sees at about half size; `flat` for a front drawn as is.
 */
export const Front = memo(function Front({
  layer,
  option,
  flat = false,
}: {
  layer: Layer;
  option: number;
  flat?: boolean;
}) {
  const info = optionsOf(layer)[option];
  return (
    <div
      className={cn(
        'flex h-full items-center',
        // the long module names wrap under the layer on a phone
        flat ? 'flex-wrap gap-x-3 gap-y-2 px-4 py-3' : 'gap-6 px-7',
      )}
    >
      <Chip
        layer={layer}
        className={cn(flat ? 'w-[104px]' : 'h-12 w-[228px] gap-3 px-4 text-[32px] [&_svg]:size-5')}
      />
      <span
        className={cn(
          'flex items-center border border-lp-line-strong bg-lp-paper-2 font-pixel leading-none',
          // 12px or more from its frame on screen, at the camera's smallest scale
          flat ? 'h-8 px-3 text-[18px]' : 'h-12 w-[540px] px-7 text-[32px]',
        )}
      >
        <Roller value={info.name} />
      </span>
      {layer === 'core' && (
        <span
          className={cn(
            'font-mono whitespace-nowrap text-lp-ink-2',
            flat ? 'text-[13px]' : 'text-[32px]',
          )}
        >
          kept
        </span>
      )}
    </div>
  );
});

/**
 * The page the UI layer renders: your own on `fumadocs-core` when headless; the CLI's copy is the
 * same page, its source in your project.
 */
export const PageFace = memo(function PageFace({
  option,
  page,
}: {
  option: number;
  page: ReactNode;
}) {
  const { name, title } = optionsOf('ui')[option];
  // no UI package: your own UI on the core
  const headless = name === 'fumadocs-core';
  return (
    <div className="relative grid">
      <Crossfade
        shown={headless ? 'headless' : 'page'}
        render={(key) => (key === 'headless' ? <HeadlessPreview /> : page)}
      />
      {option > 0 && <Stamp key={name} label={title} value={name} />}
    </div>
  );
});

/** where the page comes from, stamped in the empty foot of its TOC column */
function Stamp({ label, value }: { label: string; value: string }) {
  return (
    <p className="absolute right-4 bottom-4 z-2 flex w-[252px] flex-col gap-2 border-2 border-lp-ink bg-lp-yellow px-4 py-3 text-[#121210]">
      <span className="font-pixel text-[20px] leading-none">{label}</span>
      <code className="font-mono text-[24px] leading-none">{value}</code>
    </p>
  );
}

/**
 * What a drawer holds: the file of the module in it, at the front of its top face, where it shows
 * once the drawer is out. A copy of the code window's, out of the way of focus and assistive tech.
 */
const Contents = memo(function Contents({
  layer,
  option,
  snippets,
}: {
  layer: SwapLayer;
  option: number;
  snippets: Snippets;
}) {
  const info = optionsOf(layer)[option];
  return (
    <Window
      aria-hidden
      inert
      title={
        <span className="font-mono text-xs">
          {info.title} · {info.file}
        </span>
      }
      className="absolute inset-x-8 bottom-4 overflow-hidden"
      style={{ top: PAGE.height - PULL + 12 }}
    >
      {snippets[layer][option]}
    </Window>
  );
});
