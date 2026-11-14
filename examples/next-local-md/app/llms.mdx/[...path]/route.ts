import { docsLlms } from '@/lib/source';

export const revalidate = false;
// other paths are 404s, never cached responses
export const dynamicParams = false;

export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/[...path]'>) {
  const { path } = await params;
  return (await docsLlms.serve(`/${path.join('/')}`)) ?? new Response(null, { status: 404 });
}

export async function generateStaticParams() {
  const params: { path: string[] }[] = [];
  for (const path of await docsLlms.files()) {
    if (path !== '/llms.txt' && path !== '/llms-full.txt')
      params.push({ path: path.slice(1).split('/') });
  }
  return params;
}
