import { source } from '@/lib/source';
import type { OramaDocument } from 'fumadocs-core/search/orama-cloud';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const results: OramaDocument[] = [];
  const pages = source.getPages();
  for (const page of pages) {
    if (page.data.type === 'openapi') continue;

    const items = getBreadcrumbItems(page.url, source.pageTree, {
      includePage: false,
      includeRoot: true,
    });

    results.push({
      id: page.url,
      structured: page.data.structuredData,
      tag: page.slugs[0],
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      breadcrumbs: items.flatMap<string>((item, i) =>
        i > 0 && typeof item.name === 'string' ? item.name : [],
      ),
    });
  }

  return Response.json(results);
}
