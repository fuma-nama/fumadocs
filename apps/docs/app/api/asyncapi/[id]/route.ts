import { asyncapi } from '@/lib/asyncapi';
import { cacheLife } from 'next/cache';

export async function GET(_req: Request, { params }: RouteContext<'/api/asyncapi/[id]'>) {
  return Response.json(await getBundled((await params).id));
}

// loading the schema is async, the cache lets the response prerender
async function getBundled(id: string) {
  'use cache';
  cacheLife({ revalidate: Infinity });
  return (await asyncapi.getSchema(id)).bundled;
}

export async function generateStaticParams() {
  return Object.keys(await asyncapi.getSchemas()).map((id) => ({ id }));
}
