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

export function getPageImagePath(slugs: string[], locale?: string) {
  return (
    '/' + [locale, ...docsImageRoute.split('/'), ...slugs, 'image.webp'].filter(Boolean).join('/')
  );
}
