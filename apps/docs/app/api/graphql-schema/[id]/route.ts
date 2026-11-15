import { graphql } from '@/lib/graphql';
import { cacheLife } from 'next/cache';

export async function GET(_req: Request, { params }: RouteContext<'/api/graphql-schema/[id]'>) {
  return new Response(await getSdl((await params).id));
}

// loading the schema is async, the cache lets the response prerender
async function getSdl(id: string) {
  'use cache';
  cacheLife({ revalidate: Infinity });
  return (await graphql.getSchema(id)).sdl;
}

export async function generateStaticParams() {
  return Object.keys(await graphql.getSchemas()).map((id) => ({ id }));
}
