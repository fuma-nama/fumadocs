import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { localMd } from '@fumadocs/local-md';

const docs = localMd({
  dir: 'content/docs',
});

if (process.env.NODE_ENV === 'development') {
  void docs.devServer();
}

// See https://fumadocs.dev/docs/headless/source-api for more info
export const getSource = docs.toSourceFactory((source) => {
  return loader(source, {
    baseUrl: docsRoute,
    plugins: [lucideIconsPlugin()],
  });
});

type Source = Awaited<ReturnType<typeof getSource>>;

export function getPageImage(page: InferPageType<Source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: InferPageType<Source>) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<Source>) {
  return `# ${page.data.title} (${page.url})

${page.data.content}`;
}
