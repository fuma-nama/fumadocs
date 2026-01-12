import type { Node, NodeRendererContext, FieldKey } from '@/lib/types';
import { SchemaRegistryPlugin } from '@/lib/registry';
import { useDataEngine } from '@/lib/render';
import { deepEqual } from '@/lib/utils';
import type { FC } from 'react';

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

export interface PropertyItemInfo {
  kind: 'fixed' | 'additional' | 'pattern';
  field: FieldKey;
  node: PropertyNode;
}

export interface ObjectOptions {
  Object: FC<
    NodeRendererContext<ObjectNode> & {
      properties: PropertyItemInfo[];
    }
  >;
  Property: FC<NodeRendererContext<PropertyNode>>;
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
          const { field, node } = ctx;
          const [objectKeys] = engine.useFieldValue(field, {
            compute(currentValue) {
              return currentValue ? Object.keys(currentValue) : [];
            },
            isChanged(prev, next) {
              return !deepEqual(prev, next);
            },
          });
          const properties: PropertyItemInfo[] = [];
          const unknownKeys = new Set(objectKeys);
          for (const prop of node.properties) {
            unknownKeys.delete(prop.key);
            properties.push({
              kind: 'fixed',
              field: [...field, prop.key],
              node: prop,
            });
          }

          for (const [pattern, prop] of Object.entries(node.patternProperties ?? {})) {
            const regex = RegExp(pattern);

            for (const key of unknownKeys) {
              if (!key.match(regex)) continue;
              unknownKeys.delete(key);
              properties.push({
                kind: 'pattern',
                node: {
                  type: 'property',
                  name: key,
                  key,
                  children: prop,
                },
                field: [...field, key],
              });
            }
          }

          if (node.additionalProperties) {
            const prop = node.additionalProperties;
            for (const key of unknownKeys) {
              properties.push({
                kind: 'additional',
                node: {
                  type: 'property',
                  name: key,
                  key,
                  children: prop,
                },
                field: [...field, key],
              });
            }
          }

          return <ObjectInput {...ctx} properties={properties} />;
        },
      });

      registry.registerNode<PropertyNode>('property', {
        Node: Property,
      });
    },
  };
}

export function objectNode(node: ObjectNode): ObjectNode {
  return node;
}
