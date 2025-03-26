import type { Route } from './+types/search';
import { createSearchAPI, type Index } from 'fumadocs-core/search/server';
import { source } from '~/source';

const server = createSearchAPI('simple', {
  indexes: source.getPages().map(
    (page) =>
      ({
        title: page.data.title ?? '',
        content: page.data.content,
        url: page.url,
        description: page.data.description,
      }) satisfies Index,
  ),
});

export async function loader({ request }: Route.LoaderArgs) {
  return server.GET(request);
}
