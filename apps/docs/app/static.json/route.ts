import { source } from '@/lib/source';
import type { OramaDocument } from 'fumadocs-core/search/orama-cloud';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const pages = source.getPages();
  const results = pages
    .filter((page) => page.slugs[0] !== 'openapi')
    .map((page) => {
      const { structuredData } = page.data;
      const items = getBreadcrumbItems(page.url, source.pageTree, {
        includePage: false,
        includeRoot: true,
      });

      return {
        id: page.url,
        structured: structuredData,
        tag: page.slugs[0],
        url: page.url,
        title: page.data.title,
        description: page.data.description,
        breadcrumbs: items.flatMap<string>((item, i) =>
          i > 0 && typeof item.name === 'string' ? item.name : [],
        ),
      } satisfies OramaDocument;
    });

  return Response.json(results);
}
