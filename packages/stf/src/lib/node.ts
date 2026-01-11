import type { ReactNode } from 'react';
import type { FieldKey } from './data-engine';

export interface Node {
  type: string;
}

export interface NodeRendererContext<N extends Node> {
  node: N;
  field: FieldKey;
  render: (field: FieldKey, v: Node) => ReactNode;
}

export interface NodeRenderer<N extends Node> {
  Node: (ctx: NodeRendererContext<N>) => ReactNode;
}
