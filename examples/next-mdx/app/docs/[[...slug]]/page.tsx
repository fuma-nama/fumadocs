import { getPage, getPages } from '@/app/source';
import type { Metadata } from 'next';
import { DocsPage, DocsBody, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(params.slug);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>

      <DocsBody>
        <div className="mb-8 text-lg text-fd-muted-foreground">
          {page.data.description_md}
        </div>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = getPage(params.slug);

  if (!page) notFound();

  return {
    title: page.data.title,
  } satisfies Metadata;
}
