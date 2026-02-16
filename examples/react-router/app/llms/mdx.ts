import type { Route } from './+types/mdx';
import { getLLMText, source } from '@/lib/source';

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) {
    return new Response('not found', { status: 404 });
  }
  return new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown',
    },
  });
}
