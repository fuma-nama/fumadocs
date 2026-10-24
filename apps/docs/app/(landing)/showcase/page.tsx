import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cn } from '@/lib/cn';
import { createMetadata } from '@/lib/metadata';
import { blogs, type ShowcaseObject, showcases } from '@/lib/showcases';
import { Figure, FigureHeader, Lead } from '../ui/figure';
import { address, SiteTile } from '../ui/site-tile';
import { Cascade, type Slide } from './cascade';
import { copy, kinds, suggest } from './data';
import { Develop } from './develop';
import { Featured } from './featured';

export const metadata: Metadata = createMetadata({
  title: 'Showcase',
  description: copy.header.summary,
  openGraph: {
    url: 'https://fumadocs.dev/showcase',
  },
  alternates: {
    types: { 'text/markdown': '/showcase.md' },
  },
});

const figure = 'flex flex-col gap-12 px-(--lp-gutter) py-16 md:gap-16 md:py-20';

export default function Page() {
  const slides: Slide[] = [];
  for (const { name, url, image } of showcases) if (image) slides.push({ name, url, image });

  return (
    <>
      <Figure
        n={1}
        id="showcase"
        aria-label="Showcase"
        status={`showing ${address(slides[0].url)}`}
        className="grid gap-12 px-(--lp-gutter) py-16 md:py-20 lg:grid-cols-[5fr_4fr] lg:items-end lg:gap-x-12 xl:grid-cols-2 xl:gap-x-16"
      >
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl leading-[1.02] font-medium tracking-[-0.035em] text-balance md:text-6xl">
            <Lead>{copy.header.lead}</Lead>{' '}
            <span className="block max-w-[16ch]">{copy.header.title}</span>
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-pretty text-lp-ink-2">
            {copy.header.description}
          </p>
          <a
            href={suggest}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex h-11 w-fit items-center border border-lp-line-strong bg-lp-yellow px-5 font-medium text-[#121210] transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none max-sm:w-full max-sm:justify-center"
          >
            Suggest yours ↗
          </a>
        </div>
        <Cascade sites={slides} />
      </Figure>
      <Figure
        n={2}
        id="featured"
        aria-label="Featured"
        status={`${Object.keys(kinds).length} featured`}
        className={figure}
      >
        <FigureHeader lead={copy.featured.lead} title={copy.featured.title} />
        <Featured />
      </Figure>
      <Figure
        n={3}
        id="sites"
        aria-label="All sites"
        status={`${showcases.length} sites online`}
        className={figure}
      >
        <FigureHeader lead={copy.sites.lead} title={copy.sites.title} />
        <Wall
          sites={showcases}
          sizes="(min-width: 1400px) 334px, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <Slot />
        </Wall>
      </Figure>
      <Figure
        n={4}
        id="blogs"
        aria-label="Blogs"
        status={`${blogs.length} blogs online`}
        className={figure}
      >
        <FigureHeader lead={copy.blogs.lead} title={copy.blogs.title} />
        <Wall
          sites={blogs}
          sizes="(min-width: 1400px) 334px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="sm:grid-cols-2 lg:grid-cols-4"
        />
      </Figure>
    </>
  );
}

function Wall({
  sites,
  sizes,
  className,
  children,
}: {
  sites: ShowcaseObject[];
  sizes: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Develop>
      <ul className={cn('grid border-s border-t border-lp-line-strong', className)}>
        {sites.map((site) => (
          <li key={site.url} className="border-e border-b border-lp-line-strong">
            <SiteTile site={site} sizes={sizes} printable>
              <span className="flex h-6 items-center justify-between gap-3 border-t border-lp-line-strong px-3 font-mono text-[11px] text-lp-ink-2 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
                <span className="truncate">{address(site.url)}</span>
                <span aria-hidden>↗</span>
              </span>
            </SiteTile>
          </li>
        ))}
        {children}
      </ul>
    </Develop>
  );
}

/** the empty place after the last site, drawn as a phantom window */
function Slot() {
  return (
    <li className="border-e border-b border-lp-line-strong">
      <a
        href={suggest}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex h-full flex-col bg-lp-paper p-2 outline-offset-2 outline-lp-ink focus-visible:relative focus-visible:z-10 focus-visible:outline"
      >
        <span className="flex aspect-[1.91/1] flex-1 items-center justify-center border border-dashed border-lp-line-strong font-medium group-hover:border-solid group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
          Suggest yours ↗
        </span>
      </a>
    </li>
  );
}
