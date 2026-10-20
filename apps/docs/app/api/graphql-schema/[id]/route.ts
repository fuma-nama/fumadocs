import { graphql } from '@/lib/graphql';

export async function GET(_req: Request, { params }: RouteContext<'/api/graphql-schema/[id]'>) {
  return new Response((await graphql.getSchema((await params).id)).sdl);
}

export async function generateStaticParams() {
  return Object.keys(await graphql.getSchemas()).map((id) => ({ id }));
}
