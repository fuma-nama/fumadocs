import { Content } from './content';
import { getPage } from '@/app/source';
import { allDocs } from 'contentlayer/generated';
import type { Metadata } from 'next';
import { DocsPage, DocsBody } from 'next-docs-ui/page';
import { getTableOfContents } from 'next-docs-zeta/server';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(params.slug);

  if (page == null) {
    notFound();
  }

  const toc = await getTableOfContents(page.body.raw);

  return (
    <DocsPage url={page.url} toc={toc}>
      <DocsBody>
        <h1>{page.title}</h1>
        <Content code={page.body.code} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  return allDocs.map((page) => ({
    slug: page.slug.split('/'),
  }));
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = getPage(params.slug);

  if (page == null) notFound();

  return {
    title: page.title,
    description: page.description,
  } satisfies Metadata;
}
