import { source } from '@/lib/source';
import type { Graph } from '@/components/graph-view';

export async function buildGraph(): Promise<Graph> {
  const graph: Graph = { links: [], nodes: [] };

  await Promise.all(
    source.getPages().map(async (page) => {
      if (page.data.type === 'openapi') return;

      graph.nodes.push({
        id: page.url,
        url: page.url,
        text: page.data.title,
        description: page.data.description,
      });

      const { extractedReferences = [] } = await page.data.load();
      for (const ref of extractedReferences) {
        const refPage = source.getPageByHref(ref.href);
        if (!refPage) continue;

        graph.links.push({
          source: page.url,
          target: refPage.page.url,
        });
      }
    }),
  );

  return graph;
}
