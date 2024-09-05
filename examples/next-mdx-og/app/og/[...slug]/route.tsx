import { generateOGImage } from 'fumadocs-ui/og';
import { type NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { source } from '@/app/source';

export function GET(
  _: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const page = source.getPage(params.slug.slice(0, -1));
  if (!page) notFound();

  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: 'My App',
  });
}

export function generateStaticParams() {
  return source.generateParams().map((params) => ({
    ...params,
    slug: [...params.slug, 'og.png'],
  }));
}
