import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blog } from '@/utils/source';
import { createMetadata } from '@/utils/metadata';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { ShareIcon } from 'lucide-react';
import { Control } from '@/app/(home)/blog/[slug]/page.client';

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
      <div className="container py-12 bg-gradient-to-t from-primary/30 to-50% border rounded-xl md:px-8">
        <h1 className="text-3xl font-bold mb-2">{page.data.title}</h1>
        <p className="text-muted-foreground mb-4">{page.data.description}</p>
        <Link
          href="/blog"
          className={buttonVariants({ size: 'sm', variant: 'secondary' })}
        >
          Back
        </Link>
      </div>
      <article className="container px-0 py-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] lg:px-4">
        <div className="prose p-4">
          <page.data.exports.default />
        </div>
        <div className="flex flex-col gap-4 border-l p-4">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Written by</p>
            <p className="font-semibold">{page.data.author}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm mb-1">At</p>
            <p className="font-semibold">
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
