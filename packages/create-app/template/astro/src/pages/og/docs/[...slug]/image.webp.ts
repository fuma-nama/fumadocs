import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';
import { generateOGImage } from 'fumadocs-ui/og/takumi';
import { source } from '@/lib/source';
import { appName } from '@/lib/shared';

export const getStaticPaths = (() => {
  return source.getPages().map((page) => ({
    params: { slug: page.slugs.join('/') || undefined },
    props: { page },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<InferGetStaticPropsType<typeof getStaticPaths>> = ({
  props: { page },
}) => {
  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: appName,
    format: 'webp',
  });
};
