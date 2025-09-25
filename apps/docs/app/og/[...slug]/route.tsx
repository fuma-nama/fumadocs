import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { generate as MetadataImage, getImageResponseOptions } from './generate';
import { ImageResponse } from '@takumi-rs/image-response';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'/og/[...slug]'>,
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    (
      <MetadataImage
        title={page.data.title}
        description={page.data.description}
      />
    ),
    await getImageResponseOptions(),
  );
}

export function generateStaticParams(): {
  slug: string[];
}[] {
  return source.generateParams().map((page) => ({
    ...page,
    slug: [...page.slug, 'image.webp'],
  }));
}
