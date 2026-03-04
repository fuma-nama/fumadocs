import { createFromSource } from 'fumadocs-core/search/server';
import { getSource, Source } from '@/lib/source';
import { revalidable } from '@/lib/revalidable';
import { structure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { getConfigRuntime } from '@/config/load-runtime';

const getServer = revalidable({
  async create(source: Source) {
    return createFromSource(source, {
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
});

export async function GET(request: Request) {
  const config = await getConfigRuntime();
  const source = await getSource(config);
  const server = await getServer(source);
  return server.GET(request);
}
