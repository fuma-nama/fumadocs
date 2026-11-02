'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';
import { getSection } from '@/lib/source/navigation';
import LogoImage from '@/public/logo.png';

export function Body({ children }: { children: ReactNode }): React.ReactElement {
  const mode = useMode();

  return <body className={cn(mode, 'relative flex min-h-screen flex-col')}>{children}</body>;
}

export function useMode(): string | undefined {
  const { slug = [] } = useParams();
  if (Array.isArray(slug)) return getSection(slug[0]);
}

export function FumadocsIcon(props: React.SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <svg width="80" height="80" viewBox="0 0 180 180" {...props}>
      <circle
        cx="90"
        cy="90"
        r="89"
        fill={`url(#${id}-iconGradient)`}
        stroke="var(--color-fd-primary)"
        strokeWidth="1"
      />
      <defs>
        <linearGradient id={`${id}-iconGradient`} gradientTransform="rotate(45)">
          <stop offset="45%" stopColor="var(--color-fd-background)" />
          <stop offset="100%" stopColor="var(--color-fd-primary)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo() {
  return (
    <>
      <Image
        alt="Fumadocs"
        src={LogoImage}
        sizes="100px"
        className="hidden w-22 in-[.uwu]:block"
        aria-label="Fumadocs"
      />
      <FumadocsIcon className="size-5 in-[.uwu]:hidden" />
    </>
  );
}

/** the nav's title, never prefetched: every page shows it, and the landing page is a heavy one */
export function NavTitle({ href = '/', ...props }: ComponentProps<'a'>) {
  return (
    <Link href={href} prefetch={false} {...props}>
      <Logo />
      <span className="font-medium in-[.uwu]:hidden">Fumadocs</span>
    </Link>
  );
}
