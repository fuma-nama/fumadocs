'use client';
import { lazy, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ForceGraphMethods,
  ForceGraphProps,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import { forceCollide, forceLink, forceManyBody } from 'd3-force';
import { useRouter } from 'fumadocs-core/framework';

export interface Graph {
  links: Link[];
  nodes: Node[];
}

export type Node = NodeObject<NodeType>;
export type Link = LinkObject<NodeType, LinkType>;

export interface NodeType {
  text: string;
  description?: string;
  neighbors?: string[];
  url: string;
}

export type LinkType = Record<string, unknown>;

export interface GraphViewProps {
  graph: Graph;
}

const ForceGraph2D = lazy(
  () => import('react-force-graph-2d'),
) as typeof import('react-force-graph-2d').default;

export function GraphView(props: GraphViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  useEffect(() => {
    setMount(true);
  }, []);

  return (
    <div
      ref={ref}
      className="relative border h-[600px] [&_canvas]:size-full rounded-xl overflow-hidden"
    >
      {mount && <ClientOnly {...props} containerRef={ref} />}
    </div>
  );
}

function ClientOnly({
  containerRef,
  graph,
}: GraphViewProps & { containerRef: RefObject<HTMLDivElement | null> }) {
  const graphRef = useRef<ForceGraphMethods<Node, Link> | undefined>(undefined);
  const hoveredRef = useRef<Node | null>(null);
  const router = useRouter();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  const handleNodeHover = (node: Node | null) => {
    const graph = graphRef.current;
    if (!graph) return;
    hoveredRef.current = node;

    if (node) {
      const coords = graph.graph2ScreenCoords(node.x!, node.y!);
      setTooltip({
        x: coords.x + 4,
        y: coords.y + 4,
        content: node.description ?? 'No description',
      });
    } else {
      setTooltip(null);
    }
  };

  // Custom node rendering: circle with text label below
  const nodeCanvasObject: ForceGraphProps['nodeCanvasObject'] = (node, ctx) => {
    const container = containerRef.current;
    if (!container) return;
    const style = getComputedStyle(container);
    const fontSize = 14;
    const radius = 5;

    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);

    const hoverNode = hoveredRef.current;
    const isActive = hoverNode?.id === node.id || hoverNode?.neighbors?.includes(node.id as string);

    ctx.fillStyle = isActive
      ? style.getPropertyValue('--color-fd-primary')
      : style.getPropertyValue('--color-purple-300');
    ctx.fill();

    // Draw text below the node
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getComputedStyle(container).getPropertyValue('color');
    ctx.fillText(node.text, node.x!, node.y! + radius + fontSize);
  };

  const linkColor = (link: Link) => {
    const container = containerRef.current;
    if (!container) return '#999';
    const style = getComputedStyle(container);
    const hoverNode = hoveredRef.current;

    if (
      hoverNode &&
      typeof link.source === 'object' &&
      typeof link.target === 'object' &&
      (hoverNode.id === link.source.id || hoverNode.id === link.target.id)
    ) {
      return style.getPropertyValue('--color-fd-primary');
    }

    return `color-mix(in oklab, ${style.getPropertyValue('--color-fd-muted-foreground')} 50%, transparent)`;
  };

  // Enrich nodes with neighbors for hover effects
  const enrichedNodes = useMemo(() => {
    const { nodes, links } = structuredClone(graph);
    for (const node of nodes) {
      node.neighbors = links.flatMap((link) => {
        if (link.source === node.id) return link.target as string;
        if (link.target === node.id) return link.source as string;
        return [];
      });
    }

    return {
      nodes,
      links,
    };
  }, [graph]);

  return (
    <>
      <ForceGraph2D<NodeType, LinkType>
        ref={{
          get current() {
            return graphRef.current;
          },
          set current(fg) {
            graphRef.current = fg;
            if (fg) {
              fg.d3Force('link', forceLink().distance(200));
              fg.d3Force('charge', forceManyBody().strength(10));
              fg.d3Force('collision', forceCollide(60));
            }
          },
        }}
        graphData={enrichedNodes}
        nodeCanvasObject={nodeCanvasObject}
        linkColor={linkColor}
        onNodeHover={handleNodeHover}
        onNodeClick={(node) => {
          router.push(node.url);
        }}
        linkWidth={2}
        enableNodeDrag
        enableZoomInteraction
      />
      {tooltip && (
        <div
          className="absolute bg-fd-popover text-fd-popover-foreground size-fit p-2 border rounded-xl shadow-lg text-sm max-w-xs"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.content}
        </div>
      )}
    </>
  );
}
