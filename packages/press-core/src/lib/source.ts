import { localMd } from '@fumadocs/local-md';
import { dynamicLoader } from 'fumadocs-core/source/dynamic';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';

const docs = localMd({
  dir: 'content',
});

if (import.meta.env.DEV) {
  void docs.devServer();
}

const source = dynamicLoader(docs.dynamicSource(), {
  baseUrl: '/',
  plugins: [lucideIconsPlugin()],
});

export async function getSource() {
  return source.get();
}

export function getPageImage(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.webp');
  } else {
    segments[segments.length - 1] += '.webp';
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  return `# ${page.data.title} (${page.url})

${page.data.content}`;
}
