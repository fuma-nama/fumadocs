import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import { blog } from '@/lib/source';
import { createMetadata } from '@/lib/metadata';
import { buttonVariants } from '@/components/ui/button';
import { ShareButton } from '@/app/(home)/blog/[slug]/page.client';
import { getMDXComponents } from '@/mdx-components';
import path from 'node:path';
import { cn } from '@/lib/cn';

export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();
  const { body: Mdx, toc } = await page.data.load();

  return (
    <article className="flex flex-col mx-auto w-full max-w-[800px] px-4 py-8">
      <div className="flex flex-row gap-4 text-sm mb-8">
        <div>
          <p className="mb-1 text-fd-muted-foreground">Written by</p>
          <p className="font-medium">{page.data.author}</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-fd-muted-foreground">At</p>
          <p className="font-medium">
            {new Date(
              page.data.date ??
                path.basename(page.path, path.extname(page.path)),
            ).toDateString()}
          </p>
        </div>
      </div>

      <h1 className="text-3xl font-semibold mb-4">{page.data.title}</h1>
      <p className="text-fd-muted-foreground mb-8">{page.data.description}</p>

      <div className="prose min-w-0 flex-1">
        <div className="flex flex-row items-center gap-2 mb-8 not-prose">
          <ShareButton url={page.url} />
          <Link
            href="/blog"
            className={cn(
              buttonVariants({
                size: 'sm',
                variant: 'secondary',
              }),
            )}
          >
            Back
          </Link>
        </div>

        <InlineTOC items={toc} />
        <Mdx components={getMDXComponents()} />
      </div>
    </article>
  );
}

export async function generateMetadata(
  props: PageProps<'/blog/[slug]'>,
): Promise<Metadata> {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) notFound();

  return createMetadata({
    title: page.data.title,
    description:
      page.data.description ?? 'The library for building documentation sites',
  });
}

export function generateStaticParams(): { slug: string }[] {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}
