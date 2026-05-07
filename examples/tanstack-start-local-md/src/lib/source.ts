import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsRoute } from './shared';
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

export function markdownPathToSlugs(segs: string[]) {
  if (segs.length === 0) return [];

  const out = [...segs];
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, '');
  if (out.length === 1 && out[0] === 'index') out.pop();
  return out;
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return {
    segments,
    url: `${docsRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  return `# ${page.data.title} (${page.url})

${page.data.content}`;
}
