import Link from 'next/link';
import { type ShowcaseObject, showcases, vercel } from '@/lib/showcases';
import { copy, quotes } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { type Counter, Counters } from './counters';
import { getContributorCount, getDownloads, getStars } from './data';
import { Press } from './press';
import { Wire } from './wire';

/** tiles on the wall, the rest are on the showcase page */
const WALL = 30;

export async function Proof() {
  const [stars, downloads, contributors] = await Promise.all([
    getStars(),
    getDownloads(),
    getContributorCount(),
  ]);
  const sites: Required<ShowcaseObject>[] = [];
  for (const { name, url, image } of showcases) {
    if (image && sites.length < WALL) sites.push({ name, url, image });
  }
  const online = showcases.length + vercel.length;

  const counters: Counter[] = [];
  if (stars !== undefined) counters.push({ label: 'GitHub stars', value: stars });
  if (downloads !== undefined)
    counters.push({ label: 'Weekly downloads', value: downloads, note: 'fumadocs-core' });
  if (contributors !== undefined) counters.push({ label: 'Contributors', value: contributors });

  return (
    <Figure
      id="proof"
      aria-label="Showcase"
      status={`${online} sites online`}
      className="flex flex-col gap-10 px-(--lp-gutter) py-16 md:gap-12 md:py-20"
    >
      <FigureHeader
        lead={copy.proof.lead}
        title={copy.proof.title}
        description={copy.proof.description}
      />
      {/* 9 | 3 of 12 columns, the wall's rounded to whole pixels: a half pixel left a seam inside its frame */}
      <div className="grid gap-6 xl:grid-cols-[round(75%_-_6px,1px)_minmax(0,1fr)]">
        <Press sites={sites}>
          {/* ends level with the testimonials when they run longer than the wall */}
          <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <Link
              href="/showcase"
              className="-ms-1.5 inline-flex items-baseline gap-2 px-1.5 text-sm font-medium underline decoration-lp-line-strong underline-offset-4 hover:bg-lp-ink hover:text-lp-paper hover:no-underline focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:no-underline focus-visible:outline-none"
            >
              See all {online} sites
              <span aria-hidden className="font-pixel">
                -&gt;
              </span>
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
        </Press>
        {counters.length > 0 && <Counters items={counters} />}
        {/* beside the wall from xl, under the counters below it */}
        <Wire quotes={quotes} className="xl:col-start-2 xl:row-start-1" />
      </div>
    </Figure>
  );
}
