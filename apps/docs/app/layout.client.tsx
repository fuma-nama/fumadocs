'use client';

import { useParams } from 'next/navigation';
import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

export function Body({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const mode = useMode();

  return (
    <body className={cn(mode, 'relative flex min-h-screen flex-col')}>
      {children}
    </body>
  );
}

export function useMode(): string | undefined {
  const { slug } = useParams();
  return Array.isArray(slug) && slug.length > 0 ? slug[0] : undefined;
}

export function FumadocsIcon(props: React.SVGProps<SVGSVGElement>) {
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
            stdDeviation="0.5"
            floodColor="var(--color-fd-primary)"
            floodOpacity="1"
          />
        </filter>
        <linearGradient
          id={`${id}-iconGradient`}
          gradientTransform="rotate(45)"
        >
          <stop offset="45%" stopColor="var(--color-fd-background)" />
          <stop offset="100%" stopColor="var(--color-fd-primary)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
