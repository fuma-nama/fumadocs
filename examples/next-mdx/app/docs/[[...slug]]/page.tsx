import { getPage, getPages } from '@/app/source';
import type { Metadata } from 'next';
import { DocsPage, DocsBody, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultComponents from 'fumadocs-ui/mdx';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(params.slug);

  if (!page) {
    notFound();
  }

  const descriptionMd = toJsxRuntime(page.data.descriptionHast, {
    development: false,
    Fragment,
    // @ts-expect-error -- jsx
    jsx,
    // @ts-expect-error -- jsx
    jsxs,
    // @ts-expect-error -- jsx
    components: defaultComponents,
  });

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>

      <DocsBody>
        <div className="mb-8 text-lg text-fd-muted-foreground">
          {descriptionMd}
        </div>
        <page.data.body components={defaultComponents} />
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
