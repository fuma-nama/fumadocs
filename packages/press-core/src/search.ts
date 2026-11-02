import type { AdvancedIndex, SearchAPI } from 'fumadocs-core/search/server';
import type { BuildMode, Context } from './context';
import type { ApiRoute, AppShape } from './plugin';

/** the search index of a page, from `getPageStructuredData()` of its content source */
export async function buildIndexDefault<C extends AppShape>(
  this: Context<C>,
  page: C['page'],
): Promise<AdvancedIndex> {
  const structuredData = await this.getPageStructuredData(page);
  if (!structuredData)
    throw new Error(
      `[Fumapress] no content source gives the structured data of "${page.path}" for search, pass \`buildIndex\` to the search plugin.`,
    );

  return {
    id: page.url,
    url: page.url,
    title: page.data.title ?? page.slugs.at(-1) ?? '',
    description: page.data.description,
    structuredData,
  };
}

/** a static index for search in the browser in `static` mode, a search server in the others, like Fumapress */
export function searchRoute(mode: BuildMode, server: SearchAPI): ApiRoute {
  if (mode === 'static')
    return { path: '/api/search', render: 'static', GET: () => server.staticGET() };

  return { path: '/api/search', render: 'dynamic', GET: (request) => server.GET(request) };
}
