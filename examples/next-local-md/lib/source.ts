import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { localMd } from '@fumadocs/local-md';
import { dynamicLoader, llms } from 'fumadocs-core/source';

const docs = localMd({
  dir: 'content/docs',
});

if (process.env.NODE_ENV === 'development') {
  void docs.devServer();
}

// See https://fumadocs.dev/docs/headless/source-api for more info
export const docsLoader = dynamicLoader(docs.dynamicSource(), {
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
});

export async function getSource() {
  return docsLoader.get();
}

export const docsLlms = llms(getSource, {
  renderPage: (page) => `# ${page.data.title} (${page.url})

${page.data.content}`,
});
