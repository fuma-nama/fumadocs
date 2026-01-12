import type { Node, NodeRendererContext } from '@/lib/types';
import type { SchemaRegistryPlugin } from '../lib/registry';
import { useDataEngine } from '@/lib/render';
import { type FC } from 'react';

export interface StringNode extends Node {
  type: 'string';
  singleline?: boolean;
  defaultValue?: string;
}

export interface BooleanNode extends Node {
  type: 'boolean';
  defaultValue?: boolean;
}

export interface NumericNode extends Node {
  type: 'decimal' | 'integer';
  defaultValue?: number;
}

export interface FileNode extends Node {
  type: 'file';
  defaultValue?: undefined;
}

export type PrimitiveNode = StringNode | BooleanNode | NumericNode | FileNode;

export interface PrimitiveOptions {
  Input: FC<
    { value: unknown; setValue: (v: unknown) => void } & NodeRendererContext<PrimitiveNode>
  >;
}

export function primitivePlugin({ Input }: PrimitiveOptions): SchemaRegistryPlugin {
  return {
    apply(registry) {
      registry.registerNode<PrimitiveNode>(['string', 'boolean', 'decimal', 'integer', 'file'], {
        Node(ctx) {
          const { field, node } = ctx;
          const engine = useDataEngine();
          const [value, setValue] = engine.useFieldValue(field, {
            defaultValue: node.defaultValue,
          });

          return <Input {...ctx} value={value} setValue={setValue} />;
        },
      });
    },
  };
}

export function primitiveNode(node: PrimitiveNode): PrimitiveNode {
  return node;
}
