import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blogAuthors, blogLoader } from '@/lib/source';
import { findPost, getPosts } from '@/lib/blog';
import { createMetadata } from '@/lib/metadata';
import { getMDXComponents } from '@/components/mdx';
import {
  BlogAuthors,
  BlogBackLink,
  BlogBody,
  BlogDate,
  BlogDescription,
  BlogHeader,
  BlogPage,
  BlogPostNav,
  BlogTags,
  BlogTitle,
} from '@/components/blog';

export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const params = await props.params;
  const page = blogLoader.getPage([params.slug]);
  const found = page && findPost(getPosts(blogLoader.getPages(), blogAuthors), page.url);
  if (!page || !found) notFound();

  const { post, newer, older } = found;
  const { body: Mdx, toc } = await page.data.load();

  return (
    <BlogPage toc={toc}>
      <BlogHeader>
        <BlogBackLink href="/blog" />
        <BlogTitle>{post.title}</BlogTitle>
        <BlogDescription>{post.description}</BlogDescription>
        <BlogAuthors authors={post.authors} />
        <div className="flex w-full flex-row flex-wrap items-center gap-2">
          <BlogTags tags={post.tags} />
          {post.date && (
            <BlogDate date={post.date} className="ms-auto text-sm text-fd-muted-foreground" />
          )}
        </div>
      </BlogHeader>
      <BlogBody>
        <Mdx components={getMDXComponents()} />
      </BlogBody>
      <BlogPostNav newer={newer} older={older} />
    </BlogPage>
  );
}

export async function generateMetadata(props: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const params = await props.params;
  const page = blogLoader.getPage([params.slug]);

  if (!page) notFound();

  const { ogImage } = page.data;
  return createMetadata({
    title: page.data.title,
    description: page.data.description ?? 'The library for building documentation sites',
    ...(ogImage && { openGraph: { images: ogImage }, twitter: { images: ogImage } }),
  });
}

export function generateStaticParams(): { slug: string }[] {
  return blogLoader.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}
