import { useDataEngine } from '@/lib/data-engine';
import { Node } from '@/lib/node';
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
  Input: FC<{ value: unknown; setValue: (v: unknown) => void; node: EnumNode }>;
}

export function enumPlugin({ Input }: EnumOptions): SchemaRegistryPlugin {
  return {
    apply(registry) {
      registry.registerNode<EnumNode>('enum', {
        Node({ field, node }) {
          const engine = useDataEngine();
          const [value, setValue] = engine.useFieldValue(field, {
            defaultValue: node.defaultValue,
          });

          return <Input node={node} value={value} setValue={setValue} />;
        },
      });
    },
  };
}
