import { openapi } from '@/lib/openapi';

export async function GET(_req: Request, { params }: RouteContext<'/api/openapi/[id]'>) {
  return Response.json((await openapi.getSchema((await params).id)).bundled);
}

export async function generateStaticParams() {
  return Object.keys(await openapi.getSchemas()).map((id) => ({ id }));
}
