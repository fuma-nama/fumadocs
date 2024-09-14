import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const server = createFromSource(source);

export async function GET() {
  return Response.json(await server.export());
}
