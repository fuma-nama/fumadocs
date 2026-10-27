import { memo } from 'react';
import { DITHER_MASKS } from '../../lib/dither';
import { FRAME, type LayoutId, PLANS } from './data';
import { percent } from './scene';

/** `x, y, w, h` rectangles in a row as one SVG path */
function path(rects: number[]): string {
  let d = '';
  for (let i = 0; i < rects.length; i += 4)
    d += `M${rects[i]} ${rects[i + 1]}h${rects[i + 2]}v${rects[i + 3]}h${-rects[i + 2]}z`;
  return d;
}

/** the layout in 1 bit from its measured plan: panels stippled in screen space, text as bars */
export const Plan = memo(function Plan({ layout }: { layout: LayoutId }) {
  const plan = PLANS[layout];
  const dots = [];
  for (let i = 0; i < plan.dots.length; i += 4) {
    const [x, y, w, h] = plan.dots.slice(i, i + 4);
    dots.push(
      <span
        key={i}
        className="absolute bg-lp-ink"
        style={{ ...percent(x, y, w, h, FRAME), maskImage: DITHER_MASKS[2], maskSize: '4px 4px' }}
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
        viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
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
      <span
        className="absolute bg-lp-yellow outline outline-lp-ink"
        style={percent(x, y, w, h, FRAME)}
      />
    </span>
  );
});
