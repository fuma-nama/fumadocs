import type { APIRoute, GetStaticPaths } from 'astro';
import { docsLlms } from '@/lib/source';

export const prerender = true;

export const getStaticPaths = (async () => {
  const paths: { params: { path: string } }[] = [];
  for (const path of await docsLlms.files())
    paths.push({ params: { path: decodeURI(path.slice(1)) } });
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => (await docsLlms.serve(`/${params.path}`))!;
