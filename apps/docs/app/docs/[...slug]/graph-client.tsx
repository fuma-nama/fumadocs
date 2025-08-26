'use client';
import { useMemo } from 'react';
import type { Graph } from '@/app/docs/[...slug]/graph';
import ForceGraph2D, {
  GraphData,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';

type NodeType = {
  title: string;
};
type LinkType = {};
export function GraphComponent({ graph }: { graph: Graph }) {
  const graphData = useMemo(() => {
    const out: GraphData<
      NodeObject<NodeType>,
      LinkObject<NodeType, LinkType>
    > = { nodes: [], links: [] };

    for (const node of graph.values()) {
      out.nodes.push({
        id: node.id,
        title: node.title,
      });

      for (const ref of node.referenced) {
        out.links.push({
          source: node.id,
          target: ref,
        });
      }
    }

    return out;
  }, [graph]);

  return (
    <div className="size-full">
      <ForceGraph2D
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.25}
        graphData={graphData}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.title;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(
            (n) => n + fontSize * 0.2,
          ) as [number, number];

          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(
            node.x! - bckgDimensions[0] / 2,
            node.y! - bckgDimensions[1] / 2,
            ...bckgDimensions,
          );

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'white';
          ctx.fillText(label, node.x!, node.y!);

          node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          const bckgDimensions = node.__bckgDimensions as [number, number];

          if (bckgDimensions)
            ctx.fillRect(
              node.x! - bckgDimensions[0] / 2,
              node.y! - bckgDimensions[1] / 2,
              ...bckgDimensions,
            );
        }}
      />
    </div>
  );
}
