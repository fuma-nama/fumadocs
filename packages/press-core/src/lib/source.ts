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

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
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

export function markdownPathToSlugs(segs: string[]) {
  const slugs = [...segs];
  if (slugs.length === 0) return [];

  slugs[slugs.length - 1] = slugs[slugs.length - 1]!.replace(/\.md$/, '');
  if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();

  return slugs;
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  return `# ${page.data.title} (${page.url})

${page.data.content}`;
}
