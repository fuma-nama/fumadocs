import { getPage, pages } from '@/app/source';
import type { Metadata } from 'next';
import { DocsPage, DocsBody } from 'next-docs-ui/page';
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

  const MDX = page.data.default;

  return (
    <DocsPage url={page.url} toc={page.data.toc}>
      <DocsBody>
        <h1>{page.matter.title}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return pages.map((page) => ({
    slug: page.slugs,
  }));
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = getPage(params.slug);

  if (page == null) notFound();

  return {
    title: page.matter.title,
    description: page.matter.description,
  } satisfies Metadata;
}
