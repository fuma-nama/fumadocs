import { docsLlms } from '@/lib/llms';

export const revalidate = false;
// other paths are 404s, never cached responses
export const dynamicParams = false;

/** the files of `docsLlms` under `/docs` and `/<locale>/docs`, the proxy rewrites their paths here */
export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/[...path]'>) {
  const { path } = await params;
  return (await docsLlms.serve(`/${path.join('/')}`)) ?? new Response(null, { status: 404 });
}

export async function generateStaticParams() {
  const params: { path: string[] }[] = [];
  for (const path of await docsLlms.files()) {
    if (/^(?:\/[^/]+)?\/docs/.test(path))
      params.push({ path: decodeURI(path).slice(1).split('/') });
  }
  return params;
}
