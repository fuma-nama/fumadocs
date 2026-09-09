export const appName = 'React Router';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: 'fuma-nama',
  repo: 'fumadocs',
  branch: 'main',
};

export function getPageUrl(base: string, segments: string[], locale?: string) {
  return '/' + [locale, ...base.split('/'), ...segments].filter(Boolean).join('/');
}

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getPageUrl(docsContentRoute, segments, page.locale) };
}
