import type { ComponentProps, ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { ShowcaseObject } from '@/lib/showcases';

/** where a site lives, without the protocol or a trailing slash */
export function address(url: string): string {
  const { host, pathname } = new URL(url);
  return host + pathname.replace(/\/$/, '');
}

interface SiteTileProps extends Omit<ComponentProps<'a'>, 'href' | 'children'> {
  site: ShowcaseObject;
  /** `sizes` of the screenshot */
  sizes: string;
}

const box =
  'relative size-2.5 shrink-0 border border-lp-line-strong bg-lp-paper group-hover:invisible group-focus-visible:invisible';

/** a tile's striped title bar, its title between two boxes; inverted while its tile is pointed at */
function TileBar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'relative flex h-5 items-center gap-1 px-1 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper',
        className,
      )}
    >
      <span
        aria-hidden
        className="lp-pinstripe absolute inset-x-1 inset-y-0 group-hover:hidden group-focus-visible:hidden"
      />
      <span aria-hidden className={box} />
      <span className="relative mx-auto min-w-0 truncate bg-lp-paper px-1.5 font-pixel text-xs leading-none group-hover:bg-transparent group-focus-visible:bg-transparent">
        {children}
      </span>
      <span aria-hidden className={box} />
    </span>
  );
}

/**
 * A real site as a window of the desktop: its name in the title bar, its screenshot below, or its
 * initial for a site without one.
 */
export function SiteTile({ site, sizes, className, ...props }: SiteTileProps) {
  return (
    <a
      {...props}
      href={site.url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'group flex flex-col bg-lp-paper outline-offset-2 outline-lp-ink focus-visible:relative focus-visible:z-10 focus-visible:outline',
        className,
      )}
    >
      <TileBar className="border-b border-lp-line-strong">{site.name}</TileBar>
      {site.image ? (
        <span className="relative block aspect-og overflow-hidden">
          <Image src={site.image} alt="" fill sizes={sizes} className="object-cover" />
        </span>
      ) : (
        // the initial scales with the tile
        <span
          aria-hidden
          className="flex aspect-og items-center justify-center bg-lp-paper-2 @container group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper"
        >
          <span className="font-pixel text-[40cqw] leading-none">{site.name[0]}</span>
        </span>
      )}
    </a>
  );
}
