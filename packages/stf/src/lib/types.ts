import type { FC } from 'react';

export type FieldKey = (string | number)[];

export interface Node {
  type: string;
  match?: (value: unknown) => boolean;
}

export interface NodeRendererContext<N extends Node> extends Record<string, unknown> {
  node: N;
  field: FieldKey;
}

export interface NodeRenderer<N extends Node> {
  Node: FC<NodeRendererContext<N>>;
}
