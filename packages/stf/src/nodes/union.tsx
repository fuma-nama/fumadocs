import { useDataEngine } from '@/lib/data-engine';
import { Node, NodeRendererContext } from '@/lib/node';
import { SchemaRegistryPlugin } from '@/lib/registry';
import { FC, useState } from 'react';

export interface UnionNode extends Node {
  type: 'union';
  members: {
    /** the member ID (unique in the `members` array) */
    id: string;
    /** display name */
    name: string;
    node: Node;
    /**
     * test if the field value satisifies this union member
     */
    isActive: (value: unknown) => boolean;
  }[];
}

export interface UnionOptions {
  Selector: FC<{
    selectedMember?: string;
    setSelectedMember: (id: string) => void;
    ctx: NodeRendererContext<UnionNode>;
  }>;
}

export function unionPlugin({ Selector }: UnionOptions): SchemaRegistryPlugin {
  return {
    apply(registry) {
      registry.registerNode<UnionNode>('union', {
        Node(ctx) {
          const { field, node } = ctx;
          const engine = useDataEngine();
          const [selectedMember, setSelectedMember] = useState(() => {
            const initial = engine.init(field);
            return node.members.find((member) => member.isActive(initial))?.id;
          });

          return (
            <Selector
              selectedMember={selectedMember}
              setSelectedMember={setSelectedMember}
              ctx={ctx}
            />
          );
        },
      });
    },
  };
}
