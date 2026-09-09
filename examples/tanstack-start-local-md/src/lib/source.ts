import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsRoute } from './shared';
import { localMd } from '@fumadocs/local-md';
import { dynamicLoader, llms } from 'fumadocs-core/source';

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

export async function getDocsLlms() {
  return llms(await getSource(), {
    renderPage: (page) => `# ${page.data.title} (${page.url})

${page.data.content}`,
  });
}
