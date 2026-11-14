import type { Metadata } from 'next/types';
import { Page } from './source';
import { i18n } from './i18n';

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: 'https://fumadocs.dev',
      images: '/banner.png',
      siteName: 'Fumadocs',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@fuma_nama',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/banner.png',
      ...override.twitter,
    },
    alternates: {
      ...override.alternates,
      types: {
        'application/rss+xml': [
          {
            title: 'Fumadocs Blog',
            url: 'https://fumadocs.dev/blog/rss.xml',
          },
        ],
        ...override.alternates?.types,
      },
    },
  };
}

export function getPageImageUrl(page: Page) {
  // the default language has no locale, like the URLs of its pages
  const segments = [...page.slugs, 'image.webp'];
  if (page.locale && page.locale !== i18n.defaultLanguage) segments.unshift(page.locale);

  return {
    segments,
    url: `/og/${segments.join('/')}`,
  };
}

export const baseUrl =
  process.env.NODE_ENV === 'development' || !process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL('http://localhost:3000')
    : new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
