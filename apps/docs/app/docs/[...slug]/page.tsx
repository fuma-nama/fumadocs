import { ExternalLinkIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { Card, Cards } from 'next-docs-ui/mdx/card';
import { DocsPage, DocsBody } from 'next-docs-ui/page';
import { getGithubLastEdit } from 'next-docs-zeta/server';
import { notFound } from 'next/navigation';
import { utils, type Page } from '@/utils/source';
import { createMetadata } from '@/utils/metadata';
import Preview from '@/components/preview';

interface Param {
  slug: string[];
}

export default async function Page({
  params,
}: {
  params: Param;
}): Promise<JSX.Element> {
  const page = utils.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const path = `apps/docs/content/docs/${page.info.path}`;
  const time = await getGithubLastEdit({
    owner: 'fuma-nama',
    repo: 'next-docs',
    path,
    token: process.env.GIT_TOKEN
      ? `Bearer ${process.env.GIT_TOKEN}`
      : undefined,
  });

  const preview = page.data.preview?.trim();

  return (
    <DocsPage
      url={page.url}
      tree={utils.pageTree}
      toc={page.data.exports.toc}
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
      <DocsBody>
        <div className="not-prose mb-12">
          <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            {page.data.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {page.data.description}
          </p>
        </div>
        {preview && preview in Preview ? Preview[preview] : null}
        {page.data.index ? (
          <Category page={page} />
        ) : (
          <page.data.exports.default />
        )}
      </DocsBody>
    </DocsPage>
  );
}

function Category({ page }: { page: Page }): JSX.Element {
  const filtered = utils.files.filter(
    (docs) =>
      docs.type === 'page' &&
      docs.info.dirname === page.info.dirname &&
      docs.info.name !== 'index',
  ) as Page[];

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

  const imageParams = new URLSearchParams();
  imageParams.set('title', page.data.title);
  imageParams.set('description', description);

  const image = {
    alt: 'Banner',
    url: `/api/og/${params.slug[0]}?${imageParams.toString()}`,
    width: 1200,
    height: 630,
  };

  return createMetadata({
    title: page.data.title,
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
  return (
    utils.getPages()?.map<Param>((page) => ({
      slug: page.slugs,
    })) ?? []
  );
}
