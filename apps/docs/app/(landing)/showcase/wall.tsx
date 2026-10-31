import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { type ShowcaseObject, vercel } from '@/lib/showcases';
import { address, SiteTile } from '../ui/site-tile';
import { TitleBar } from '../ui/window';
import { arrange, copy, kinds, suggest } from './data';
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
/** a dotted leader on the baseline, from a name to what it points at */
const leader =
  'h-px min-w-4 flex-1 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px)] bg-size-[4px_1px] opacity-60';
const grid = 'grid grid-cols-2 ps-px pt-px md:grid-cols-4 xl:grid-cols-6';

function Featured({ site }: { site: Required<ShowcaseObject> }) {
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
        <TitleBar
          title={<span className={cn('-mx-2 block px-2 font-pixel', invert)}>{site.name}</span>}
        />
        <span className="relative block aspect-og overflow-hidden">
          <Image src={site.image} alt="" fill sizes={featuredSizes} className="object-cover" />
        </span>
        {/* what it is, a dotted leader on the baseline, where it lives */}
        <span
          className={cn(
            'mt-auto flex items-baseline gap-2 border-t border-lp-line-strong px-3 py-2.5 text-xs leading-4 font-medium',
            invert,
          )}
        >
          <span className="text-lp-ink-2 group-hover:text-lp-paper group-focus-visible:text-lp-paper">
            {kinds[site.url]}
          </span>
          <span aria-hidden className={leader} />
          <span className="inline-flex items-center gap-1 font-mono font-normal">
            {address(site.url)}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </span>
        </span>
      </a>
    </li>
  );
}

/** Vercel's mark and name, the title of its SDKs on both walls */
export function VercelTitle({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <svg aria-hidden viewBox="0 0 74 64" className="h-2.5 w-3 fill-current">
        <path d="M37.59.25 74.54 64.25H.64L37.59.25Z" />
      </svg>
      Vercel
    </span>
  );
}

/** a row for the docs of each of Vercel's SDKs: its name, a dotted leader, what it is */
export function VercelLinks() {
  const rows: ReactNode[] = [];
  for (const item of vercel) {
    rows.push(
      <li key={item.url} className="flex flex-1 flex-col border-b border-lp-line last:border-b-0">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="group flex min-h-9 flex-1 items-center px-3 text-xs font-medium hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          <span className="flex flex-1 items-baseline gap-2">
            <span className="text-[15px]">{item.name}</span>
            <span aria-hidden className={leader} />
            <span className="inline-flex items-center gap-1 text-lp-ink-2 group-hover:text-lp-paper group-focus-visible:text-lp-paper">
              {kinds[item.url]}
              <ArrowUpRight aria-hidden className="size-3.5" />
            </span>
          </span>
        </a>
      </li>,
    );
  }
  return rows;
}

function Vercel() {
  return (
    <li className={cn('col-span-2 flex flex-col border border-lp-line-strong bg-lp-paper', cell)}>
      <TitleBar title={<VercelTitle className="font-pixel" />} />
      <p className="p-3 text-sm leading-normal text-pretty">{copy.vercel}</p>
      <ul className="flex flex-1 flex-col border-t border-lp-line-strong">
        <VercelLinks />
      </ul>
    </li>
  );
}

function Tile({ site }: { site: ShowcaseObject }) {
  return (
    <li className={cell}>
      <SiteTile site={site} sizes={tileSizes} className={frame} />
    </li>
  );
}

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
        <span aria-hidden className="aspect-og" />
        <span className="absolute inset-2 flex items-center justify-center gap-1.5 border border-dashed border-lp-line-strong px-3 text-center text-sm font-medium group-hover:border-solid group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
          Suggest yours
          <ArrowUpRight aria-hidden className="size-4" />
        </span>
      </a>
    </li>
  );
}

export function Wall({ sites }: { sites: ShowcaseObject[] }) {
  const { featured, shots, blank } = arrange(sites);
  const cells: ReactNode[] = [];
  for (const site of featured) cells.push(<Featured key={site.url} site={site} />);
  cells.push(<Vercel key="vercel" />);
  for (const site of [...shots, ...blank]) cells.push(<Tile key={site.url} site={site} />);
  cells.push(<Slot key="slot" />);

  return <Peek className={grid}>{cells}</Peek>;
}

export function Blogs({ sites }: { sites: ShowcaseObject[] }) {
  const cells: ReactNode[] = [];
  for (const site of sites) cells.push(<Tile key={site.url} site={site} />);
  return <Peek className={grid}>{cells}</Peek>;
}
