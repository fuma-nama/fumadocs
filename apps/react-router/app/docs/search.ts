import type { Route } from './+types/search';
import {
  type AdvancedIndex,
  createSearchAPI,
} from 'fumadocs-core/search/server';
import { getSource } from '~/source';
import { structure } from 'fumadocs-core/mdx-plugins';

const server = createSearchAPI('advanced', {
  async indexes() {
    const source = await getSource();

    return await Promise.all(
      source.getPages().map(
        async (page) =>
          ({
            id: page.url,
            title: page.data.title ?? '',
            url: page.url,
            description: page.data.description,
            structuredData: structure(page.data.content),
          }) satisfies AdvancedIndex,
      ),
    );
  },
});

export async function loader({ request }: Route.LoaderArgs) {
  return server.GET(request);
}
