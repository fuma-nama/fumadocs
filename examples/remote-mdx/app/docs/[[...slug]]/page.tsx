import type { Metadata } from 'next';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { pages } from '@/app/source';
import { compile } from '@fumadocs/mdx-remote';
import defaultComponents from 'fumadocs-ui/mdx';

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = pages.find((p) => p.param === (params.slug ?? []).join('/'));

  if (!page) {
    notFound();
  }

  const compiled = await compile({
    source: page.content,
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
  return pages.map((page) => ({
    slug: page.param.split('/'),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = pages.find((p) => p.param === (params.slug ?? []).join('/'));

  if (!page) notFound();

  return {
    title: page.info.title,
  } satisfies Metadata;
}
