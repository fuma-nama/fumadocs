import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';
import { cacheLife } from 'next/cache';

export async function GET(): Promise<Response> {
  return new Response(await epub(), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="fumadocs-docs.epub"',
    },
  });
}

// zipping is async, the cache lets the file prerender
async function epub() {
  'use cache';
  cacheLife({ revalidate: Infinity });
  const buffer = await exportEpub({
    source,
    getMarkdown(page) {
      if (page.type === 'docs') return page.data.getText('raw');
    },
    title: 'Fumadocs Documentation',
    author: 'Fuma Nama',
    description: 'Documentation for Fumadocs - the React.js documentation framework',
    cover: '/og.png',
  });
  return new Uint8Array(buffer);
}
