import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { generate as MetadataImage, getImageResponseOptions } from './generate';
import { ImageResponse } from 'takumi-js/response';
import { getPageImageUrl } from '@/lib/metadata';
import { i18n } from '@/lib/i18n';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/[lang]/[...slug]'>) {
  const { lang, slug } = await params;
  const page = source.getPage(slug.slice(0, -1), lang);
  if (!page) notFound();

  return new ImageResponse(
    <MetadataImage title={page.data.title} description={page.data.description} />,
    await getImageResponseOptions(lang !== i18n.defaultLanguage),
  );
}

export function generateStaticParams(): {
  lang: string;
  slug: string[];
}[] {
  return source.getPages().map((page) => ({
    lang: page.locale!,
    slug: getPageImageUrl(page).segments,
  }));
}
