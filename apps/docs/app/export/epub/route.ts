import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const buffer = await exportEpub({
    source,
    config: {
      title: 'Fumadocs Documentation',
      author: 'Fuma Nama',
      description: 'Documentation for Fumadocs - the documentation framework for Next.js',
      cover: '/og.png',
    },
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="fumadocs-docs.epub"',
    },
  });
}
