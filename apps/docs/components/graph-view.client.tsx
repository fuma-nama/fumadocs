'use client';
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  default as Comp,
  ForceGraphMethods,
  ForceGraphProps,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';

export type Node = NodeObject<NodeType>;
export type Link = LinkObject<NodeType, LinkType>;

export type NodeType = {
  text: string;
  description?: string;
  neighbors?: string[];
};
export type LinkType = Record<string, unknown>;

const ForceGraph2D = lazy(() => import('react-force-graph-2d')) as typeof Comp<
  NodeType,
  LinkType
>;

export function GraphViewClient({
  nodes,
  links,
}: {
  nodes: Node[];
  links: Link[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<Node, Link> | undefined>(undefined);
  const [mount, setMount] = useState(false);
  const [hoverNode, setHoverNode] = useState<Node | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  useEffect(() => {
    setMount(true);
  }, []);

  const handleNodeHover = useCallback((node: Node | null) => {
    const graph = fgRef.current;
    if (!graph) return;
    setHoverNode(node);

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
  }, []);

  // Custom node rendering: circle with text label below
  const nodeCanvasObject: ForceGraphProps['nodeCanvasObject'] = (
    node,
    ctx,
    globalScale,
  ) => {
    const container = ref.current;
    if (!container) return;
    const style = getComputedStyle(container);
    const fontSize = 12 / globalScale;
    const radius = 5;

    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
    const isActive =
      hoverNode?.id === node.id ||
      hoverNode?.neighbors?.includes(node.id as string);

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

  const linkColor = useCallback(
    (link: Link) => {
      const container = ref.current;
      if (!container) return '#999';
      const style = getComputedStyle(container);

      if (
        hoverNode &&
        typeof link.source === 'object' &&
        typeof link.target === 'object' &&
        (hoverNode.id === link.source.id || hoverNode.id === link.target.id)
      ) {
        return style.getPropertyValue('--color-fd-primary');
      }

      return `color-mix(in oklab, ${style.getPropertyValue('--color-fd-foreground')} 50%, transparent)`;
    },
    [hoverNode],
  );

  // Enrich nodes with neighbors for hover effects
  const enrichedNodes = useMemo(() => {
    const enrichedNodes = nodes.map((node) => ({
      ...node,
      neighbors: links.flatMap((link) => {
        if (link.source === node.id) return link.target;
        if (link.target === node.id) return link.source;
        return [];
      }),
    }));

    return { nodes: enrichedNodes as NodeType[], links };
  }, [nodes, links]);

  return (
    <div
      ref={ref}
      className="relative border h-[600px] [&_canvas]:size-full rounded-xl overflow-hidden"
    >
      {mount && (
        <ForceGraph2D
          ref={fgRef}
          graphData={enrichedNodes}
          nodeCanvasObject={nodeCanvasObject}
          linkColor={linkColor}
          onNodeHover={handleNodeHover}
          nodeRelSize={6}
          linkWidth={2}
          enableNodeDrag
          enableZoomInteraction
        />
      )}
      {tooltip && (
        <div
          className="absolute bg-fd-popover text-fd-popover-foreground size-fit p-2 border rounded-xl shadow-lg text-sm max-w-xs"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
