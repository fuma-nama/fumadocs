import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';
import { docsLlms, source } from '@/lib/source';

export const getStaticPaths = (() => {
  return source.getPages().map((page) => ({
    params: { slug: page.slugs.join('/') || undefined },
    props: { page },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<InferGetStaticPropsType<typeof getStaticPaths>> = async ({
  props: { page },
}) => {
  return new Response(await docsLlms.page(page), {
    headers: {
      'Content-Type': 'text/markdown',
    },
  });
};
