import { useDataEngine } from '@/lib/data-engine';
import { Node, NodeRendererContext } from '@/lib/node';
import { SchemaRegistryPlugin } from '@/lib/registry';
import { deepEqual } from '@/lib/utils';
import { FC, ReactNode } from 'react';

export interface ObjectNode extends Node {
  type: 'object';
  properties: PropertyNode[];

  patternProperties?: Record<string, Node>;
  additionalProperties?: Node;
}

export interface PropertyNode extends Node {
  type: 'property';
  /** property key */
  key: string;
  /** display name */
  name: string;

  children: Node;
}

export interface PropertyRenderInfo extends PropertyNode {
  kind: 'fixed' | 'additional' | 'pattern';
  render: () => ReactNode;
}

export interface ObjectOptions {
  Object: FC<{
    properties: PropertyRenderInfo[];
    ctx: NodeRendererContext<ObjectNode>;
  }>;
  Property: FC<
    NodeRendererContext<PropertyNode> & {
      renderChildren: () => ReactNode;
    }
  >;
}

export function objectPlugin({
  Object: ObjectInput,
  Property,
}: ObjectOptions): SchemaRegistryPlugin {
  return {
    apply(registry) {
      registry.registerNode<ObjectNode>('object', {
        Node(ctx) {
          const engine = useDataEngine();
          const { field, node, render } = ctx;
          const [objectKeys] = engine.useFieldValue(ctx.field, {
            compute(currentValue) {
              return Object.keys(currentValue ?? {});
            },
            isChanged(prev, next) {
              return !deepEqual(prev, next);
            },
          });
          const properties: PropertyRenderInfo[] = [];
          const unknownKeys = new Set(objectKeys);
          for (const prop of node.properties) {
            unknownKeys.delete(prop.key);
            properties.push({
              ...prop,
              kind: 'fixed',
              render() {
                return render([...field, prop.key], prop);
              },
            });
          }

          for (const [pattern, prop] of Object.entries(node.patternProperties ?? {})) {
            const regex = RegExp(pattern);

            for (const key of unknownKeys) {
              if (!key.match(regex)) continue;
              unknownKeys.delete(key);
              properties.push({
                type: 'property',
                kind: 'pattern',
                name: key,
                key,
                children: prop,
                render() {
                  return render([...field, key], prop);
                },
              });
            }
          }

          if (node.additionalProperties) {
            const prop = node.additionalProperties;
            for (const key of unknownKeys) {
              properties.push({
                type: 'property',
                kind: 'additional',
                name: key,
                key,
                children: prop,
                render() {
                  return render([...field, key], prop);
                },
              });
            }
          }

          return <ObjectInput ctx={ctx} properties={properties} />;
        },
      });

      registry.registerNode<PropertyNode>('property', {
        Node(ctx) {
          const { field, node, render } = ctx;
          return (
            <Property {...ctx} renderChildren={() => render([...field, node.key], node.children)} />
          );
        },
      });
    },
  };
}
