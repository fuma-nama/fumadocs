import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { blog } from '@/utils/source';
import { createMetadata } from '@/utils/metadata';
import { buttonVariants } from '@/components/ui/button';
import { Control } from '@/app/(home)/blog/[slug]/page.client';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';

interface Param {
  slug: string;
}

export const dynamicParams = false;

export default function Page({
  params,
}: {
  params: Param;
}): React.ReactElement {
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  return (
    <>
      <div className="container rounded-xl border bg-gradient-to-t from-primary/30 to-50% py-12 md:px-8">
        <h1 className="mb-2 text-3xl font-bold">{page.data.title}</h1>
        <p className="mb-4 text-muted-foreground">{page.data.description}</p>
        <Link
          href="/blog"
          className={buttonVariants({ size: 'sm', variant: 'secondary' })}
        >
          Back
        </Link>
      </div>
      <article className="container grid grid-cols-1 px-0 py-8 lg:grid-cols-[2fr_1fr] lg:px-4">
        <div className="prose p-4">
          <InlineTOC items={page.data.exports.toc} />
          <page.data.exports.default />
        </div>
        <div className="flex flex-col gap-4 border-l p-4">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Written by</p>
            <p className="font-medium">{page.data.author}</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">At</p>
            <p className="font-medium">
              {new Date(page.data.date ?? page.file.name).toDateString()}
            </p>
          </div>
          <Control url={page.url} />
        </div>
      </article>
    </>
  );
}

export function generateMetadata({ params }: { params: Param }): Metadata {
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  return createMetadata({
    title: page.data.title,
    description:
      page.data.description ?? 'The library for building documentation sites',
  });
}

export function generateStaticParams(): Param[] {
  return blog.getPages().map<Param>((page) => ({
    slug: page.slugs[0],
  }));
}
