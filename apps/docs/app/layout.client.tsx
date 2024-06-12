'use client';

import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type ReactNode, useId } from 'react';
import { cn } from '@/utils/cn';
import { modes } from '@/utils/modes';

const itemVariants = cva(
  'rounded-md px-2 py-1 transition-colors hover:text-accent-foreground',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
      },
    },
  },
);

export function Body({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const mode = useMode();

  return (
    <body className={cn(mode, 'flex min-h-screen flex-col')}>{children}</body>
  );
}

export function NavChildren(): React.ReactElement {
  const mode = useMode();

  return (
    <div className="rounded-md border bg-secondary/50 p-1 text-sm text-muted-foreground max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2">
      {modes.map((m) => (
        <Link
          key={m.param}
          href={`/docs/${m.param}`}
          className={cn(itemVariants({ active: mode === m.param }))}
        >
          {m.name}
        </Link>
      ))}
    </div>
  );
}

export function useMode(): string | undefined {
  const { slug } = useParams();
  return Array.isArray(slug) && slug.length > 0 ? slug[0] : undefined;
}

export function FumadocsIcon(
  props: React.SVGProps<SVGSVGElement>,
): React.ReactElement {
  const id = useId();
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 180 180"
      filter={`url(#${id}-shadow)`}
      {...props}
    >
      <circle cx="90" cy="90" r="90" fill={`url(#${id}-iconGradient)`} />
      <defs>
        <filter id={`${id}-shadow`} colorInterpolationFilters="sRGB">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="1"
            floodColor="hsl(var(--primary))"
            floodOpacity="1"
          />
        </filter>
        <linearGradient
          id={`${id}-iconGradient`}
          gradientTransform="rotate(45)"
        >
          <stop offset="45%" stopColor="hsl(var(--background))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
    </svg>
  );
}
