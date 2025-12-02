import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { generate as MetadataImage, getImageResponseOptions } from './generate';
import { ImageResponse } from '@takumi-rs/image-response';
import { getPageImage } from '@/lib/metadata';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'/og/[...slug]'>,
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    <MetadataImage
      title={page.data.title}
      description={page.data.description}
    />,
    await getImageResponseOptions(),
  );
}

export function generateStaticParams(): {
  slug: string[];
}[] {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
