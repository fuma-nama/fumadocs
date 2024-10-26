import type { Metadata } from 'next';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getDocs } from '@/app/source';
import defaultComponents from 'fumadocs-ui/mdx';
import { resolveFile } from '@fumadocs/mdx-remote/github';
import { compileMDX } from '@fumadocs/mdx-remote';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = (await getDocs()).getPage(params.slug);
  if (!page) notFound();

  const content = await resolveFile(page);
  if (!content) notFound();

  const compiled = await compileMDX({
    source: content,
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
  return (await getDocs()).getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = (await getDocs()).getPage(params.slug);

  if (!page) notFound();

  return {
    title: page.data.title,
  } satisfies Metadata;
}
