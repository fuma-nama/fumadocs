import type { APIRoute } from 'astro';
import { createFromSource } from 'fumadocs-core/search/server';
import { getFullExport, source } from '@/lib/source';
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';

const server = createFromSource(source, {
  async buildIndex(page) {
    const { structuredData } = await getFullExport(page.data._raw);

    return {
      id: page.data._raw.id,
      title: page.data.title,
      description: page.data.description,
      structuredData,
      url: page.url,
      breadcrumbs: getBreadcrumbItems(page.url, source.pageTree).map((item) =>
        String(item.name),
      ),
    };
  },
});

export const GET: APIRoute = () => {
  return server.staticGET();
};
