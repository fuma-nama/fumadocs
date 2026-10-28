import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { owner, repo } from '@/lib/github';
import { showcases, vercel } from '@/lib/showcases';
import { copy, quotes } from '../../content';
import { copy as showcase } from '../../showcase/data';
import { VercelLinks, VercelTitle } from '../../showcase/wall';
import { Figure, FigureHeader } from '../../ui/figure';
import { SiteTile, TileBar } from '../../ui/site-tile';
import { type Counter, Counters } from './counters';
import { getContributorCount, getDownloads, getStars } from './data';
import { Press } from './press';

/** cells on the wall: its tiles, the last one into the showcase page with the rest */
const WALL = 30;
/** cells on phones, the rest of the wall shows from md */
const PHONE = 12;
const sizes = '(min-width: 1280px) 208px, (min-width: 768px) 20vw, 50vw';

/** the wall's last tile, the way into the full showcase */
function More({ count }: { count: number }) {
  return (
    <li>
      <Link
        href="/showcase"
        className="group flex h-full flex-col bg-lp-paper outline-offset-2 outline-lp-ink focus-visible:relative focus-visible:z-10 focus-visible:outline"
      >
        <TileBar className="border-b border-lp-line-strong">Showcase</TileBar>
        <span className="flex aspect-og items-center justify-center gap-2 bg-lp-paper-2 px-2 text-center text-sm font-medium group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
          See all {count} sites
          <span aria-hidden>-&gt;</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Vercel's SDKs, the wall's last row: a window across it, its cells on the wall's columns, what the
 * SDKs are over two of them and a row for each one's docs over the rest
 */
function Vercel() {
  return (
    <li className="col-span-full grid grid-cols-subgrid gap-y-px">
      <TileBar className="col-span-full bg-lp-paper">
        <VercelTitle />
      </TileBar>
      <p className="col-span-2 bg-lp-paper p-3 text-sm leading-normal text-pretty">
        {showcase.vercel}
      </p>
      <ul className="col-span-2 flex flex-col bg-lp-paper md:col-span-3">
        <VercelLinks />
      </ul>
    </li>
  );
}

export async function Proof() {
  const [stars, downloads, contributors] = await Promise.all([
    getStars(),
    getDownloads(),
    getContributorCount(),
  ]);
  const tiles: ReactNode[] = [];
  for (const site of showcases) {
    if (tiles.length === WALL - 1) break;
    if (!site.image) continue;
    tiles.push(
      <li key={site.url} className={cn(tiles.length >= PHONE - 1 && 'max-md:hidden')}>
        <SiteTile site={site} sizes={sizes} />
      </li>,
    );
  }
  const online = showcases.length + vercel.length;

  const repository = `${owner}/${repo}`;
  const counters: Counter[] = [];
  if (stars !== undefined)
    counters.push({ label: 'GitHub stars', value: stars, source: repository });
  if (downloads !== undefined)
    counters.push({ label: 'Weekly downloads', value: downloads, source: 'fumadocs-core' });
  if (contributors !== undefined)
    counters.push({ label: 'Contributors', value: contributors, source: repository });

  return (
    <Figure
      id="proof"
      aria-label="Showcase"
      status={`${online} sites online`}
      className="flex flex-col gap-10 px-(--lp-gutter) py-16 md:gap-12 md:py-20"
    >
      <FigureHeader title={copy.proof.title} />
      {/* 9 | 3 of 12 columns, the wall's rounded to whole pixels: a half pixel left a seam inside its frame */}
      <div className="grid gap-6 xl:grid-cols-[round(75%_-_6px,1px)_minmax(0,1fr)]">
        <Press>
          <ul className="grid grid-cols-2 gap-px border border-lp-line-strong bg-lp-line-strong md:grid-cols-5">
            {tiles}
            <More count={online} />
            <Vercel />
          </ul>
        </Press>
        {counters.length > 0 && <Counters items={counters} />}
        {/* testimonials as a notification feed: beside the wall from xl, under the counters below it */}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 xl:col-start-2 xl:row-start-1">
          {quotes.map((quote) => (
            <figure
              key={quote.name}
              className="flex flex-col border border-lp-line-strong bg-lp-paper"
            >
              <blockquote className="relative flex-1 px-4 pt-3.5 pb-4 text-[15px] leading-normal text-pretty">
                {/* the opening quote hangs in the margin, by its own width */}
                <span aria-hidden className="absolute -translate-x-full text-lp-orange">
                  “
                </span>
                {quote.message}
                <span aria-hidden className="text-lp-orange">
                  ”
                </span>
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-lp-line px-4 py-2.5">
                <Image
                  src={`${quote.avatar}?s=80`}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10 shrink-0 border border-lp-line-strong grayscale"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{quote.name}</span>
                  <span className="truncate text-sm text-lp-ink-2">{quote.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Figure>
  );
}
