import type { Metadata } from 'next';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getPage, getPages } from '@/app/source';
import { compile } from '@fumadocs/mdx-remote';
import defaultComponents from 'fumadocs-ui/mdx';

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(params.slug);

  if (!page) {
    notFound();
  }

  const compiled = await compile({
    source: page.data.content,
    components: {
      ...defaultComponents,
    },
  });

  return (
    <DocsPage toc={compiled.toc}>
      <DocsBody>{compiled.content}</DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(params.slug);

  if (!page) notFound();

  return {
    title: page.data.title,
  } satisfies Metadata;
}
