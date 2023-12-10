import { resolve } from 'node:url';
import { ExternalLinkIcon } from 'lucide-react';
import type { Metadata } from 'next';
import type { Utils } from 'next-docs-mdx/map';
import type { Page } from 'next-docs-mdx/types';
import { Card, Cards, MDXContent } from 'next-docs-ui/mdx';
import { DocsPage } from 'next-docs-ui/page';
import { getGithubLastEdit } from 'next-docs-zeta/server';
import { notFound } from 'next/navigation';
import { getUtils, tabs } from '@/utils/source';
import { createMetadata } from '@/utils/metadata';
import Preview from '@/components/preview';

interface Param {
  mode: string;
  slug?: string[];
}

export default async function Page({
  params,
}: {
  params: Param;
}): Promise<JSX.Element> {
  const tab = getUtils(params.mode);
  const page = tab.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const path = resolve('apps/docs/content/', page.file.id);
  const time = await getGithubLastEdit({
    owner: 'fuma-nama',
    repo: 'next-docs',
    path,
    token: process.env.GIT_TOKEN
      ? `Bearer ${process.env.GIT_TOKEN}`
      : undefined,
  });

  const preview = page.matter.preview?.trim();

  return (
    <DocsPage
      url={page.url}
      toc={page.data.toc}
      lastUpdate={time}
      tableOfContent={{
        footer: (
          <a
            href={`https://github.com/fuma-nama/next-docs/blob/main/${path}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
          >
            Edit on Github <ExternalLinkIcon className="ml-1 h-3 w-3" />
          </a>
        ),
      }}
    >
      <MDXContent>
        <div className="not-prose mb-12">
          <h1 className="mb-4 text-3xl font-semibold text-foreground sm:text-4xl">
            {page.matter.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {page.matter.description}
          </p>
        </div>
        {preview && preview in Preview ? Preview[preview] : null}
        {page.matter.index ? (
          <Category page={page} tab={tab} />
        ) : (
          <page.data.default />
        )}
      </MDXContent>
    </DocsPage>
  );
}

function Category({ page, tab }: { page: Page; tab: Utils }): JSX.Element {
  const filtered = tab.pages.filter(
    (docs) =>
      docs.file.dirname === page.file.dirname && docs.file.name !== 'index',
  );

  return (
    <Cards>
      {filtered.map((item) => (
        <Card
          key={item.file.id}
          title={item.matter.title}
          description={item.matter.description ?? 'No Description'}
          href={item.url}
        />
      ))}
    </Cards>
  );
}

export function generateMetadata({ params }: { params: Param }): Metadata {
  const utils = getUtils(params.mode);
  const page = utils.getPage(params.slug);

  if (!page) notFound();

  const description =
    page.matter.description ?? 'The library for building documentation sites';

  const imageParams = new URLSearchParams();
  imageParams.set('title', page.matter.title);
  imageParams.set('description', description);

  const image = {
    alt: 'Banner',
    url: `/api/og/${params.mode}?${imageParams.toString()}`,
    width: 1200,
    height: 630,
  };

  return createMetadata({
    title: page.matter.title,
    description,
    openGraph: {
      url: `https://next-docs-zeta.vercel.app/docs/${page.slugs.join('/')}`,
      images: image,
    },
    twitter: {
      images: image,
    },
  });
}

export function generateStaticParams(): Param[] {
  return Object.entries(tabs).flatMap(([mode, tab]) => {
    return tab.pages.map<Param>((page) => ({
      mode,
      slug: page.slugs,
    }));
  });
}
