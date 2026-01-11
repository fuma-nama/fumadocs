import type { ReactNode } from 'react';

export interface Node {
  type: string;
}

export interface NodeRendererContext<N extends Node> {
  node: N;
  field: string[];
  render: (field: string[], v: Node) => ReactNode;
}

export interface NodeRenderer<N extends Node> {
  Node: (ctx: NodeRendererContext<N>) => ReactNode;
}
