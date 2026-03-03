import { createFromSource, type SearchAPI } from 'fumadocs-core/search/server';
import { getSource } from '@/lib/source';
import { revalidable } from '@/lib/revalidable';
import { structure } from 'fumadocs-core/mdx-plugins/remark-structure';

const getServer = revalidable({
  async create(): Promise<SearchAPI> {
    return createFromSource(await getSource(), {
      language: 'english',
      buildIndex(page) {
        return {
          id: page.absolutePath!,
          structuredData: structure(page.data.content),
          title: page.data.title,
          description: page.data.description,
          url: page.url,
        };
      },
    });
  },
  staleTime: 10 * 1000,
});

export async function GET(request: Request) {
  return (await getServer()).GET(request);
}
