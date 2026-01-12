import { useDataEngine } from '@/lib/render';
import { Node, NodeRendererContext } from '@/lib/types';
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
  }[];
}

export interface UnionOptions {
  Selector: FC<
    {
      selectedMember?: string;
      setSelectedMember: (id: string) => void;
    } & NodeRendererContext<UnionNode>
  >;
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
            return node.members.find((member) => member.node.match && member.node.match(initial))
              ?.id;
          });

          return (
            <Selector
              {...ctx}
              selectedMember={selectedMember}
              setSelectedMember={setSelectedMember}
            />
          );
        },
      });
    },
  };
}

export function unionNode(node: UnionNode): UnionNode {
  return node;
}
