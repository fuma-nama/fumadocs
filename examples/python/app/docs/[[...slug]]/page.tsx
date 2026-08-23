import { getSource } from '@/lib/source';
import { DocsPage, DocsBody, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const source = await getSource();
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const { body, toc } = await (await page.data.load()).render();

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>{body}</DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const source = await getSource();
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const source = await getSource();
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return { title: page.data.title };
}
