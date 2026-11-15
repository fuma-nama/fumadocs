import { openapi } from '@/lib/openapi';
import { cacheLife } from 'next/cache';

export async function GET(_req: Request, { params }: RouteContext<'/api/openapi/[id]'>) {
  return Response.json(await getBundled((await params).id));
}

// loading the schema is async, the cache lets the response prerender
async function getBundled(id: string) {
  'use cache';
  cacheLife({ revalidate: Infinity });
  return (await openapi.getSchema(id)).bundled;
}

export async function generateStaticParams() {
  return Object.keys(await openapi.getSchemas()).map((id) => ({ id }));
}
