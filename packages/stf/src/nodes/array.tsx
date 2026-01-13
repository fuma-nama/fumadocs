import { FieldKey, useDataEngine } from '@/lib/data-engine';
import { Node, NodeRendererContext } from '@/lib/node';
import { SchemaRegistryPlugin } from '@/lib/registry';
import { FC, ReactNode } from 'react';

export interface ArrayNode extends Node {
  type: 'array';
  item: Node;
  defaultValue?: unknown[];
}

export interface ItemRenderInfo {
  field: FieldKey;
  render: () => ReactNode;
}

export interface ArrayOptions {
  Container: FC<{
    items: ItemRenderInfo[];
    ctx: NodeRendererContext<ArrayNode>;
  }>;
}

export function arrayPlugin({ Container }: ArrayOptions): SchemaRegistryPlugin {
  return {
    apply(registry) {
      registry.registerNode<ArrayNode>('array', {
        Node(ctx) {
          const engine = useDataEngine();
          const { field, node, render } = ctx;
          const [value] = engine.useFieldValue(ctx.field, {
            isChanged(prev, next) {
              if (Array.isArray(prev) && Array.isArray(next)) {
                // skip deep compare, we only need to update the container when item added/deleted
                return prev.length !== next.length;
              }

              return prev !== next;
            },
          });

          const items: ItemRenderInfo[] = [];
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              const itemField = [...field, i];
              items.push({
                field: itemField,
                render() {
                  return render(itemField, node.item);
                },
              });
            }
          }

          return <Container ctx={ctx} items={items} />;
        },
      });
    },
  };
}
