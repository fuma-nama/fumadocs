import { openapi } from '@/lib/openapi';

export async function GET(_req: Request, { params }: RouteContext<'/api/openapi/[id]'>) {
  const { id } = await params;
  return Response.json((await openapi.getSchema(id)).bundled);
}

export async function generateStaticParams() {
  return Object.keys(await openapi.getSchemas()).map((id) => ({ id }));
}
