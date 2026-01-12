import { useDataEngine } from '@/lib/render';
import { Node, NodeRendererContext } from '@/lib/types';
import { SchemaRegistryPlugin } from '@/lib/registry';
import { FC } from 'react';

export interface EnumNode extends Node {
  type: 'enum';
  values: {
    label: string;
    value: unknown;
  }[];
  defaultValue?: unknown;
}

export interface EnumOptions {
  Input: FC<{ value: unknown; setValue: (v: unknown) => void } & NodeRendererContext<EnumNode>>;
}

export function enumPlugin({ Input }: EnumOptions): SchemaRegistryPlugin {
  return {
    apply(registry) {
      registry.registerNode<EnumNode>('enum', {
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
