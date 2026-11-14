import type { ApiContext } from 'waku/router';
import { docsLlms } from '@/lib/source';

export async function GET(_: Request, { params }: ApiContext<'/llms.mdx/[...path]'>) {
  return (await docsLlms.serve(`/${params.path.join('/')}`)) ?? new Response(null, { status: 404 });
}

export async function getConfig() {
  const staticPaths: string[][] = [];
  for (const file of await docsLlms.files()) {
    // `/llms.txt` and `/llms-full.txt` have their own routes
    if (!/^\/llms(-full)?\.txt$/.test(file)) staticPaths.push(decodeURI(file).slice(1).split('/'));
  }
  return { render: 'static' as const, staticPaths } as const;
}
