import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { generate as MetadataImage, getImageResponseOptions } from './generate';
import { ImageResponse } from 'takumi-js/response';
import { getPageImageUrl } from '@/lib/metadata';
import { i18n } from '@/lib/i18n';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/[...slug]'>) {
  const { slug } = await params;
  // other languages start with their locale, like the URLs of their pages
  const lang = i18n.languages.find((item) => item !== i18n.defaultLanguage && item === slug[0]);
  const page = source.getPage(slug.slice(lang ? 1 : 0, -1), lang);
  if (!page) notFound();

  return new ImageResponse(
    <MetadataImage
      title={page.data.title}
      description={page.data.description}
      locale={page.locale}
    />,
    await getImageResponseOptions(page.locale),
  );
}

export function generateStaticParams(): {
  slug: string[];
}[] {
  return source.getPages().map((page) => ({
    slug: getPageImageUrl(page).segments,
  }));
}
