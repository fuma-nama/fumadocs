import { getSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const source = await getSource();

  return createFromSource(source, {
    language: 'english',
  }).GET(req);
}
