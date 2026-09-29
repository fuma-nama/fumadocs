import type { Route } from './+types/search';
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '#/lib/source.ts';

// zero config: the default `multilingual` mode works for every language
const server = createFromSource(source);

export async function loader({ request }: Route.LoaderArgs) {
  return server.GET(request);
}
