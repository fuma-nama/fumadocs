import { source } from '@/lib/source';
import { GraphViewClient, Link, Node } from './graph-view.client';

export type Graph = {
  links: Link[];
  nodes: Node[];
};

function buildGraph() {
  const pages = source.getPages();
  const graph: Graph = { links: [], nodes: [] };

  for (const page of pages) {
    graph.nodes.push({
      id: page.url,
      text: page.data.title,
      description: page.data.description,
    });

    const { extractedReferences = [] } = page.data;
    for (const ref of extractedReferences) {
      const refPage = source.getPageByHref(ref.href);
      if (!refPage) continue;

      graph.links.push({
        source: page.url,
        target: refPage.page.url,
      });
    }
  }

  return graph;
}

export function GraphView() {
  return <GraphViewClient {...buildGraph()} />;
}
