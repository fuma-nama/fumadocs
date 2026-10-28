import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const LAYER_ICONS = {
  // 8x8 pixel paths
  content: 'M0 1h8v1H0zM0 3h8v1H0zM0 5h8v1H0zM0 7h5v1H0z',
  core: 'M2 0h4v1H2zM1 1h1v1H1zM6 1h1v1H6zM0 2h1v4H0zM7 2h1v4H7zM1 6h1v1H1zM6 6h1v1H6zM2 7h4v1H2zM3 3h2v2H3z',
  ui: 'M0 0h8v3H0zM0 3h1v5H0zM7 3h1v5H7zM1 7h6v1H1z',
  framework: 'M0 4h8v2H0zM1 6h1v2H1zM6 6h1v2H6zM2 1h4v3H2z',
} as const;

export type Layer = keyof typeof LAYER_ICONS;

/** label of a Fumadocs layer, shared by the hero satellites and the parts figure */
export function Chip({
  layer,
  children,
  className,
  ...props
}: ComponentProps<'span'> & { layer: Layer }) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 border border-lp-line-strong bg-lp-paper px-2 font-pixel text-xs leading-none whitespace-nowrap',
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        className="size-2.5 shrink-0 fill-current"
      >
        <path d={LAYER_ICONS[layer]} />
      </svg>
      {children ?? layer}
    </span>
  );
}
