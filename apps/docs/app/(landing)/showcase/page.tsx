import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { createMetadata } from '@/lib/metadata';
import { blogs, showcases } from '@/lib/showcases';
import { Figure, FigureHeader, Lead } from '../ui/figure';
import { address } from '../ui/site-tile';
import { arrange, copy, online, suggest } from './data';
import { DeckBack, DeckFront } from './deck';
import { Projector } from './projector';
import { Blogs, Wall } from './wall';

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
  const { featured, shots } = arrange(showcases);
  const reel = [...featured, ...shots];

  return (
    <>
      <Figure
        id="showcase"
        aria-label="Showcase"
        status={`showing ${address(reel[0].url)}`}
        className="grid gap-12 px-(--lp-gutter) py-16 md:py-20 lg:grid-cols-[5fr_4fr] lg:items-end lg:gap-x-12 xl:grid-cols-2 xl:gap-x-16"
      >
        {/* side by side, the button's bottom edge sits on the base's */}
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
            className="mt-4 inline-flex h-11 w-fit items-center gap-1.5 border border-lp-line-strong bg-lp-yellow px-5 font-medium text-[#121210] transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none max-sm:w-full max-sm:justify-center"
          >
            Suggest yours
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </div>
        <Projector sites={reel} back={<DeckBack count={reel.length} />} front={<DeckFront />} />
      </Figure>
      <Figure id="sites" aria-label="Sites" status={`${online} sites online`} className={figure}>
        <FigureHeader lead={copy.sites.lead} title={copy.sites.title} />
        <Wall sites={showcases} />
      </Figure>
      <Figure
        id="blogs"
        aria-label="Blogs"
        status={`${blogs.length} blogs online`}
        className={figure}
      >
        <FigureHeader lead={copy.blogs.lead} title={copy.blogs.title} />
        <Blogs sites={blogs} />
      </Figure>
    </>
  );
}
