import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsRoute } from './shared';
import { localMd } from '@fumadocs/local-md';
import { dynamicLoader } from 'fumadocs-core/source/dynamic';

const docs = localMd({
  dir: 'content/docs',
});

if (import.meta.env.DEV) {
  void docs.devServer();
}

const source = dynamicLoader(docs.dynamicSource(), {
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
});

export async function getSource() {
  return source.get();
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
