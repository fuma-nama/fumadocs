import { type CSSProperties, memo } from 'react';
import { DITHER_MASKS } from '../../lib/bayer';
import { FRAME_H, FRAME_W, type LayoutId } from './data';
import { PLANS } from './plans';

function place(x: number, y: number, w: number, h: number): CSSProperties {
  return {
    left: `${(x / FRAME_W) * 100}%`,
    top: `${(y / FRAME_H) * 100}%`,
    width: `${(w / FRAME_W) * 100}%`,
    height: `${(h / FRAME_H) * 100}%`,
  };
}

/** `x, y, w, h` rectangles in a row as one SVG path */
function path(rects: number[]): string {
  let d = '';
  for (let i = 0; i < rects.length; i += 4)
    d += `M${rects[i]} ${rects[i + 1]}h${rects[i + 2]}v${rects[i + 3]}h${-rects[i + 2]}z`;
  return d;
}

/**
 * The layout drawn in 1 bit from its measured plan, at any size: panels in a screen-space stipple,
 * hairline frames, text as solid bars. The shared search trigger is marked in yellow.
 */
export const Plan = memo(function Plan({ layout }: { layout: LayoutId }) {
  const plan = PLANS[layout];
  const dots = [];
  for (let i = 0; i < plan.dots.length; i += 4) {
    const [x, y, w, h] = plan.dots.slice(i, i + 4);
    dots.push(
      <span
        key={i}
        className="absolute bg-lp-ink"
        style={{ ...place(x, y, w, h), maskImage: DITHER_MASKS[2], maskSize: '4px 4px' }}
      />,
    );
  }
  const [x, y, w, h] = plan.search;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 block overflow-hidden bg-lp-paper"
    >
      {dots}
      <svg
        viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="absolute inset-0 size-full"
      >
        <path
          d={path(plan.boxes)}
          vectorEffect="non-scaling-stroke"
          className="fill-lp-paper stroke-lp-ink"
        />
        <path
          d={path(plan.lines)}
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-lp-ink"
        />
        <path d={path(plan.solid)} className="fill-lp-ink" />
      </svg>
      <span className="absolute bg-lp-yellow outline outline-lp-ink" style={place(x, y, w, h)} />
    </span>
  );
});
