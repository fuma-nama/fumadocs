'use client';

import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';
import { modes } from '@/utils/modes';
import Logo from '@/public/logo.png';

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

export function Title(): React.ReactElement {
  const pathname = usePathname();

  if (pathname === '/uwu') {
    return (
      <Image
        alt="Fumadocs"
        src={Logo}
        sizes="100px"
        className="w-20 md:w-24"
        aria-label="Fumadocs"
      />
    );
  }

  return (
    <>
      <FumadocsIcon className="size-5" fill="currentColor" />
      <span className="max-md:hidden">Fumadocs</span>
    </>
  );
}

export function Body({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const mode = useMode();

  return <div className={mode}>{children}</div>;
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

export function SidebarBanner(): React.ReactElement {
  const mode = useMode();
  const currentMode = modes.find((item) => item.param === mode) ?? modes[0];
  const Icon = currentMode.icon;

  return (
    <div className="-mt-2 flex flex-row items-center gap-2 rounded-lg p-2 text-card-foreground transition-colors hover:bg-muted/80">
      <Icon className="size-9 shrink-0 rounded-md bg-primary/30 bg-gradient-to-t from-background/80 p-1.5 text-primary shadow-md shadow-primary/50" />
      <div>
        <p className="font-medium">{currentMode.package}</p>
        <p className="text-xs text-muted-foreground">
          {currentMode.description} - {currentMode.version}
        </p>
      </div>
    </div>
  );
}

export function FumadocsIcon(
  props: React.SVGProps<SVGSVGElement>,
): React.ReactElement {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 180 180"
      filter="url(#shadow)"
      {...props}
    >
      <circle cx="90" cy="90" r="90" fill="url(#iconGradient)" />
      <defs>
        <filter id="shadow" colorInterpolationFilters="sRGB">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="1"
            floodColor="hsl(var(--primary))"
            floodOpacity="1"
          />
        </filter>
        <linearGradient id="iconGradient" gradientTransform="rotate(45)">
          <stop offset="45%" stopColor="hsl(var(--background))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
    </svg>
  );
}
