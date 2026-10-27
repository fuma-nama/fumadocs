import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { owner, repo } from '@/lib/github';
import { showcases, vercel } from '@/lib/showcases';
import { copy, quotes } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { SiteTile } from '../../ui/site-tile';
import { type Counter, Counters } from './counters';
import { getContributorCount, getDownloads, getStars } from './data';
import { Press } from './press';

/** tiles on the wall, the rest are on the showcase page */
const WALL = 30;
/** tiles on phones, the rest of the wall shows from md */
const PHONE = 12;
const sizes = '(min-width: 1280px) 208px, (min-width: 768px) 20vw, 50vw';

export async function Proof() {
  const [stars, downloads, contributors] = await Promise.all([
    getStars(),
    getDownloads(),
    getContributorCount(),
  ]);
  const tiles: ReactNode[] = [];
  for (const site of showcases) {
    if (tiles.length === WALL) break;
    if (!site.image) continue;
    tiles.push(
      <li key={site.url} className={cn(tiles.length >= PHONE && 'max-md:hidden')}>
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
      <FigureHeader lead={copy.proof.lead} title={copy.proof.title} />
      {/* 9 | 3 of 12 columns, the wall's rounded to whole pixels: a half pixel left a seam inside its frame */}
      <div className="grid gap-6 xl:grid-cols-[round(75%_-_6px,1px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Press>
            <ul className="grid grid-cols-2 gap-px border border-lp-line-strong bg-lp-line-strong md:grid-cols-5">
              {tiles}
            </ul>
          </Press>
          {/* ends level with the testimonials when they run longer than the wall */}
          <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <Link
              href="/showcase"
              className="-ms-1.5 inline-flex items-baseline gap-2 px-1.5 text-sm font-medium underline decoration-lp-line-strong underline-offset-4 hover:bg-lp-ink hover:text-lp-paper hover:no-underline focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:no-underline focus-visible:outline-none"
            >
              See all {online} sites
              <span aria-hidden>-&gt;</span>
            </Link>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-lp-ink-2">
              Also the docs of Vercel’s open source SDKs:
              {vercel.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-lp-ink underline decoration-lp-line-strong underline-offset-4 hover:bg-lp-ink hover:text-lp-paper hover:no-underline"
                >
                  {item.name}
                </a>
              ))}
            </p>
          </div>
        </div>
        {counters.length > 0 && <Counters items={counters} />}
        {/* testimonials as a notification feed: beside the wall from xl, under the counters below it */}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 xl:col-start-2 xl:row-start-1">
          {quotes.map((quote) => (
            <figure
              key={quote.name}
              className="flex flex-col border border-lp-line-strong bg-lp-paper"
            >
              <blockquote className="flex-1 px-4 pt-3.5 pb-4 text-[15px] leading-normal text-pretty -indent-[0.42em] before:text-lp-orange before:content-['“'] after:text-lp-orange after:content-['”']">
                {quote.message}
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
