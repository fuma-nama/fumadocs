import { getPage, getLanguages } from '@/app/source';
import type { Metadata } from 'next';
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: { lang: string; slug?: string[] };
}) {
  const page = getPage(params.slug, params.lang);

  if (page == null) {
    notFound();
  }

  const MDX = page.data.exports.default;

  return (
    <DocsPage toc={page.data.exports.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return getLanguages().flatMap(({ language, pages }) =>
    pages.map((page) => ({
      lang: language,
      slug: page.slugs,
    })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { lang: string; slug?: string[] };
}) {
  const page = getPage(params.slug, params.lang);

  if (page == null) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  } satisfies Metadata;
}
