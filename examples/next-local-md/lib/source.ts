import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { localMd } from '@fumadocs/local-md';
import { dynamicLoader } from 'fumadocs-core/source/dynamic';

const docs = localMd({
  dir: 'content/docs',
});

if (process.env.NODE_ENV === 'development' && import.meta.turbopackHot) {
  void docs.devServer();
}

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = dynamicLoader(docs.dynamicSource(), {
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
});

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  return `# ${page.data.title} (${page.url})

${page.data.content}`;
}
