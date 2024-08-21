import type { Metadata } from 'next';
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
  DocsCategory,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { utils } from '@/utils/source';
import { createMetadata } from '@/utils/metadata';
import Preview from '@/components/preview';

interface Param {
  slug: string[];
}

export default function Page({
  params,
}: {
  params: Param;
}): React.ReactElement {
  const page = utils.getPage(params.slug);

  if (!page) notFound();

  const path = `apps/docs/content/docs/${page.file.path}`;
  const preview = page.data.preview;

  return (
    <DocsPage
      toc={page.data.exports.toc}
      lastUpdate={page.data.exports.lastModified}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk',
        single: false,
      }}
      editOnGithub={{
        repo: 'fumadocs',
        owner: 'fuma-nama',
        sha: 'main',
        path,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        {preview && preview in Preview ? Preview[preview] : null}
        <page.data.exports.default
          components={{
            HeadlessOnly:
              params.slug[0] === 'headless' ? Fragment : () => undefined,
            UIOnly: params.slug[0] === 'ui' ? Fragment : () => undefined,
          }}
        />
        {page.data.index ? (
          <DocsCategory page={page} pages={utils.getPages()} />
        ) : null}
      </DocsBody>
    </DocsPage>
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
  return utils.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
