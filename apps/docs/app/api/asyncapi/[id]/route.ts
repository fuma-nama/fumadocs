import { asyncapi } from '@/lib/asyncapi';

export async function GET(_req: Request, { params }: RouteContext<'/api/asyncapi/[id]'>) {
  return Response.json((await asyncapi.getSchema((await params).id)).bundled);
}

export async function generateStaticParams() {
  return Object.keys(await asyncapi.getSchemas()).map((id) => ({ id }));
}
