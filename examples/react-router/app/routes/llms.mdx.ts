import type { Route } from './+types/llms.mdx';
import { docsLlms } from '@/lib/source';

export async function loader({ params }: Route.LoaderArgs) {
  return (await docsLlms.serve(`/${params['*']}`)) ?? new Response(null, { status: 404 });
}
