import type { Metadata } from 'next';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getPage, getPages } from '@/app/source';
import defaultComponents from 'fumadocs-ui/mdx';

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = await getPage(params.slug);

  if (!page) {
    notFound();
  }

  const compiled = await page.compile({
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
  return (await getPages()).map((page) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = await getPage(params.slug);

  if (!page) notFound();

  return {
    title: page.frontmatter.title,
  } satisfies Metadata;
}
