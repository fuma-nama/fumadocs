import { source } from '@/lib/source';

export type Graph = Map<string, Node>;
export type Node = {
  id: string;
  title: string;
  referenced: string[];
};

export async function buildGraph() {
  const pages = source.getPages();
  const graph: Graph = new Map();

  for (const page of pages) {
    const node: Node = {
      id: page.url,
      title: page.data.title,
      referenced: [],
    };

    graph.set(page.url, node);

    const { extractedReferences = [] } = page.data;
    for (const ref of extractedReferences) {
      const refPage = source.getPageByHref(ref.href);
      if (!refPage) continue;

      node.referenced.push(refPage.page.url);
    }
  }

  return graph;
}
