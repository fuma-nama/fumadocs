export const docsImageRoute = '/og/docs';

export function getPageUrl(base: string, segments: string[], locale?: string) {
  return '/' + [locale, ...base.split('/'), ...segments].filter(Boolean).join('/');
}

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.webp'];

  return { segments, url: getPageUrl(docsImageRoute, segments, page.locale) };
}
