import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { type ShowcaseObject, vercel } from '@/lib/showcases';
import { address, SiteTile } from '../ui/site-tile';
import { copy, kinds, suggest } from './data';
import { Peek } from './peek';

const featuredSizes =
  '(min-width: 1400px) 445px, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw';
const tileSizes =
  '(min-width: 1400px) 223px, (min-width: 1280px) 17vw, (min-width: 768px) 25vw, 50vw';

const invert =
  'group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper';
/** a cell overlaps its neighbours by its 1px frame, so the grid's outer edges are its frames' */
const cell = '-ms-px -mt-px';
const frame = 'h-full border border-lp-line-strong';
/** one grid: 2 columns on a phone, 4 on a tablet, 6 from 1280px; a featured window spans 2 */
const grid = 'grid grid-cols-2 ps-px pt-px md:grid-cols-4 xl:grid-cols-6';

/** a name past `budget` characters ends on a word */
function fit(name: string, budget: number): string {
  if (name.length <= budget) return name;
  const end = name.lastIndexOf(' ', budget - 1);
  return `${name.slice(0, end > 0 ? end : budget - 1)}…`;
}

/** a larger window's title bar: stripes, its two boxes, the name */
function Bar({ children }: { children: ReactNode }) {
  return (
    <span className="relative flex h-7 shrink-0 items-center gap-1.5 border-b border-lp-line-strong px-1.5">
      <span aria-hidden className="lp-pinstripe absolute inset-x-1.5 inset-y-0" />
      <span aria-hidden className="relative size-3.5 border border-lp-line-strong bg-lp-paper" />
      <span className="relative mx-auto truncate bg-lp-paper px-2 font-pixel text-[13px] leading-[17px]">
        {children}
      </span>
      <span aria-hidden className="relative size-3.5 border border-lp-line-strong bg-lp-paper" />
    </span>
  );
}

/** a featured project: a larger window, and what it is in its own words */
function Featured({ site, kind }: { site: ShowcaseObject; kind: string }) {
  return (
    <li className={cn('col-span-2', cell)}>
      <a
        href={site.url}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          'group flex flex-col bg-lp-paper outline-offset-2 outline-lp-ink focus-visible:relative focus-visible:z-10 focus-visible:outline',
          frame,
        )}
      >
        <Bar>
          <span className={cn('-mx-2 block px-2', invert)}>{site.name}</span>
        </Bar>
        {site.image && (
          <span className="relative block aspect-[1.91/1] overflow-hidden">
            <Image src={site.image} alt="" fill sizes={featuredSizes} className="object-cover" />
          </span>
        )}
        <span
          className={cn(
            'mt-auto flex h-9 items-center justify-between gap-3 border-t border-lp-line-strong px-3 font-mono text-xs',
            invert,
          )}
        >
          <span className="text-lp-ink-2 group-hover:text-lp-paper group-focus-visible:text-lp-paper">
            {kind}
          </span>
          <span className="inline-flex items-center gap-1">
            {address(site.url)}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </span>
        </span>
      </a>
    </li>
  );
}

/** Vercel: the open source SDKs whose docs run on Fumadocs, in one window */
function Vercel() {
  const rows: ReactNode[] = [];
  for (const item of vercel) {
    rows.push(
      <li key={item.url} className="flex flex-1 flex-col border-b border-lp-line last:border-b-0">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="group flex min-h-9 flex-1 items-center justify-between gap-3 px-3 font-mono text-xs hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          <span className="font-sans text-[15px] font-medium">{item.name}</span>
          <span className="inline-flex items-center gap-1 text-lp-ink-2 group-hover:text-lp-paper group-focus-visible:text-lp-paper">
            {kinds[item.url]}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </span>
        </a>
      </li>,
    );
  }
  return (
    <li className={cn('col-span-2 flex flex-col border border-lp-line-strong bg-lp-paper', cell)}>
      <Bar>
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden viewBox="0 0 74 64" className="h-2.5 w-3 fill-current">
            <path d="M37.59.25 74.54 64.25H.64L37.59.25Z" />
          </svg>
          Vercel
        </span>
      </Bar>
      <p className="p-3 text-sm leading-normal text-pretty">{copy.vercel}</p>
      <ul className="flex flex-1 flex-col border-t border-lp-line-strong">{rows}</ul>
    </li>
  );
}

/**
 * A site's tile. Its title bar fits about 20 characters of the pixel type, 15 in a tile under 160px
 * on a small phone; its initial, for a site without a screenshot, scales with it.
 */
function Tile({ site }: { site: ShowcaseObject }) {
  const name = fit(site.name, 20);
  const short = fit(site.name, 15);
  return (
    <li className={cell}>
      <SiteTile
        site={site}
        sizes={tileSizes}
        name={
          name === site.name && short === site.name ? (
            name
          ) : (
            <>
              <span className="sr-only">{site.name}</span>
              <span aria-hidden className="@max-[159px]:hidden">
                {name}
              </span>
              <span aria-hidden className="hidden @max-[159px]:inline">
                {short}
              </span>
            </>
          )
        }
        className={cn('@container [&_[data-glyph]]:text-[min(88px,40cqw)]', frame)}
      />
    </li>
  );
}

/** the empty place after the last site, drawn as a phantom window of a tile's size */
function Slot() {
  return (
    <li className={cell}>
      <a
        href={suggest}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          'group relative flex flex-col bg-lp-paper outline-offset-2 outline-lp-ink focus-visible:z-10 focus-visible:outline',
          frame,
        )}
      >
        <span aria-hidden className="h-5" />
        <span aria-hidden className="aspect-[1.91/1]" />
        <span className="absolute inset-2 flex items-center justify-center gap-1.5 border border-dashed border-lp-line-strong px-3 text-center text-sm font-medium group-hover:border-solid group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
          Suggest yours
          <ArrowUpRight aria-hidden className="size-4" />
        </span>
      </a>
    </li>
  );
}

/**
 * Every site in one wall: the projects people know lead it in larger windows with their own words,
 * Vercel's SDKs beside them, then every other site, the ones without a screenshot last, and the
 * place for yours.
 */
export function Wall({ sites }: { sites: ShowcaseObject[] }) {
  const cells: ReactNode[] = [];
  const rest: ReactNode[] = [];
  const blank: ReactNode[] = [];
  for (const site of sites) {
    const kind = kinds[site.url];
    if (kind && site.image) cells.push(<Featured key={site.url} site={site} kind={kind} />);
    else if (site.image) rest.push(<Tile key={site.url} site={site} />);
    else blank.push(<Tile key={site.url} site={site} />);
  }
  cells.push(<Vercel key="vercel" />, ...rest, ...blank, <Slot key="slot" />);

  return (
    <Peek>
      <ul className={grid}>{cells}</ul>
    </Peek>
  );
}

/** the blogs, in the wall's cells */
export function Blogs({ sites }: { sites: ShowcaseObject[] }) {
  const cells: ReactNode[] = [];
  for (const site of sites) cells.push(<Tile key={site.url} site={site} />);
  return (
    <Peek>
      <ul className={grid}>{cells}</ul>
    </Peek>
  );
}
