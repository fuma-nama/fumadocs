import { Node, NodeRendererContext, FieldKey } from '@/lib/types';
import { SchemaRegistryPlugin } from '@/lib/registry';
import { useDataEngine } from '@/lib/render';
import { FC } from 'react';

export interface ArrayNode extends Node {
  type: 'array';
  item: Node;
  defaultValue?: unknown[];
}

export interface ArrayItemInfo {
  field: FieldKey;
  node: Node;
}

export interface ArrayOptions {
  Container: FC<
    NodeRendererContext<ArrayNode> & {
      items: ArrayItemInfo[];
    }
  >;
}

export function arrayPlugin({ Container }: ArrayOptions): SchemaRegistryPlugin {
  return {
    apply(registry) {
      registry.registerNode<ArrayNode>('array', {
        Node(ctx) {
          const engine = useDataEngine();
          const { field, node } = ctx;
          const [value] = engine.useFieldValue(field, {
            defaultValue: node.defaultValue,
            isChanged(prev, next) {
              if (Array.isArray(prev) && Array.isArray(next)) {
                // skip unnecessary re-renders, we only need to update the container when item added/deleted
                return prev.length !== next.length;
              }

              return prev !== next;
            },
          });

          const items: ArrayItemInfo[] = [];
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              items.push({
                field: [...field, i],
                node: node.item,
              });
            }
          }

          return <Container {...ctx} items={items} />;
        },
      });
    },
  };
}

export function arrayNode(node: ArrayNode): ArrayNode {
  return node;
}
