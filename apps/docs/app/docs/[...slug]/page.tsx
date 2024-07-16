import { Edit } from 'lucide-react';
import type { Metadata } from 'next';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';
import { utils, type Page } from '@/utils/source';
import { createMetadata } from '@/utils/metadata';
import Preview from '@/components/preview';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';

interface Param {
  slug: string[];
}

export const dynamicParams = false;

export default function Page({
  params,
}: {
  params: Param;
}): React.ReactElement {
  const page = utils.getPage(params.slug);

  if (!page) notFound();

  const path = `apps/docs/content/docs/${page.file.path}`;
  const preview = page.data.preview;

  const footer = (
    <a
      href={`https://github.com/fuma-nama/fumadocs/blob/main/${path}`}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        buttonVariants({
          variant: 'secondary',
          size: 'sm',
          className: 'text-xs gap-1.5',
        }),
      )}
    >
      <Edit className="size-3" />
      Edit on Github
    </a>
  );

  return (
    <DocsPage
      toc={page.data.exports.toc}
      lastUpdate={page.data.exports.lastModified}
      full={page.data.full}
      tableOfContent={{
        footer,
      }}
      tableOfContentPopover={{ footer }}
    >
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
        {page.data.title}
      </h1>
      <p className="mb-8 text-lg text-muted-foreground">
        {page.data.description}
      </p>
      <DocsBody>
        {preview && preview in Preview ? Preview[preview] : null}
        {page.data.index ? <Category page={page} /> : null}
        <page.data.exports.default
          components={{
            HeadlessOnly:
              params.slug[0] === 'headless'
                ? ({ children }: { children: ReactNode }) => children
                : () => undefined,
            UIOnly:
              params.slug[0] === 'ui'
                ? ({ children }: { children: ReactNode }) => children
                : () => undefined,
          }}
        />
      </DocsBody>
    </DocsPage>
  );
}

function Category({ page }: { page: Page }): React.ReactElement {
  const filtered = utils
    .getPages()
    .filter(
      (item) =>
        item.file.dirname === page.file.dirname && item.file.name !== 'index',
    );

  return (
    <Cards>
      {filtered.map((item) => (
        <Card
          key={item.url}
          title={item.data.title}
          description={item.data.description ?? 'No Description'}
          href={item.url}
        />
      ))}
    </Cards>
  );
}

export function generateMetadata({ params }: { params: Param }): Metadata {
  const page = utils.getPage(params.slug);

  if (!page) notFound();

  const description =
    page.data.description ?? 'The library for building documentation sites';

  const image = {
    alt: 'Banner',
    url: `/og/docs/${page.slugs.join('/')}.png`,
    width: 1200,
    height: 630,
  };

  return createMetadata({
    title: page.data.title,
    description,
    openGraph: {
      url: `/docs/${page.slugs.join('/')}`,
      images: image,
    },
    twitter: {
      images: image,
    },
  });
}

export function generateStaticParams(): Param[] {
  return utils.getPages().map<Param>((page) => ({
    slug: page.slugs,
  }));
}
