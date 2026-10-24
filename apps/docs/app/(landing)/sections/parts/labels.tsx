import { type CSSProperties, memo, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { MARGIN, PAGE, PLAN } from './camera';
import { type Placement, placeLabels, RECTS } from './plan';

const placements = placeLabels(RECTS);

/**
 * The plan's labels, in the page's own coordinates: each part's name and API beside the page,
 * with a leader to the part. The pinned stage measures the parts again and moves them; they never
 * re-render.
 */
export const Labels = memo(function Labels() {
  const marks: ReactNode[] = [];
  const items: ReactNode[] = [];
  for (const placement of placements) {
    marks.push(
      <path
        key={`l:${placement.name}`}
        data-leader=""
        d={placement.leader}
        fill="none"
        className="stroke-lp-ink"
        vectorEffect="non-scaling-stroke"
      />,
      <circle
        key={`d:${placement.name}`}
        data-dot=""
        cx={placement.dot[0]}
        cy={placement.dot[1]}
        r={2.5}
        className="fill-lp-ink"
      />,
    );
    items.push(<Label key={placement.name} placement={placement} />);
  }
  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 overflow-visible"
        width={PAGE.width}
        height={PAGE.height}
      >
        {marks}
      </svg>
      <ul aria-label="Parts of the page">{items}</ul>
    </>
  );
});

function Label({ placement }: { placement: Placement }) {
  return (
    <li
      data-label=""
      className={cn(
        'absolute flex flex-col whitespace-nowrap',
        placement.side === 'left' && '-translate-x-full items-end',
        placement.side === 'top' && '-translate-y-full',
      )}
      style={{ left: placement.label[0], top: placement.label[1] }}
    >
      <span className="text-[14px] leading-[18px]">{placement.name}</span>
      <code className="font-mono text-[14px] leading-[18px] text-lp-ink-2">{placement.api}</code>
    </li>
  );
}

/** the plan as a still drawing, scaled to the width it is given */
export function Plan({ page }: { page: ReactNode }) {
  return (
    <div className="relative @container" style={{ aspectRatio: `${PLAN.width} / ${PLAN.height}` }}>
      <div
        className="absolute top-0 left-0 origin-top-left scale-(--k)"
        style={
          {
            width: PLAN.width,
            height: PLAN.height,
            '--k': `tan(atan2(100cqw, ${PLAN.width}px))`,
          } as CSSProperties
        }
      >
        <div
          className="absolute"
          style={{ left: MARGIN.left, top: MARGIN.top, width: PAGE.width, height: PAGE.height }}
        >
          {page}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 border border-lp-line-strong"
          />
          <Labels />
        </div>
      </div>
    </div>
  );
}
