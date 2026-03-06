import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const buffer = await exportEpub({
    source,
    getMarkdown(page) {
      if (page.data.type === 'docs') return page.data.getText('raw');
    },
    title: 'Fumadocs Documentation',
    author: 'Fuma Nama',
    description: 'Documentation for Fumadocs - the React.js documentation framework',
    cover: '/og.png',
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="fumadocs-docs.epub"',
    },
  });
}
