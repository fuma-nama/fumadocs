import { useMemo } from 'react';
import type { Node, NodeRenderer, FieldKey } from './types';
import type { ReactNode } from 'react';
import { DataEngine } from './data-engine';
import { Provider, useRender } from './render';

export interface FormProps {
  defaultValues?: object;
  children: ReactNode;
}

export class SchemaRegistry {
  private readonly nodes = new Map<string, NodeRenderer<Node>>();

  use(plugin: SchemaRegistryPlugin) {
    plugin.apply(this);
    return this;
  }

  getNodeRenderer(type: string) {
    return this.nodes.get(type);
  }

  registerNode<V extends Node>(
    type: V['type'] | V['type'][] | readonly V['type'][],
    renderer: NodeRenderer<V>,
  ): SchemaRegistry {
    if (Array.isArray(type)) {
      for (const t of type) this.nodes.set(t, renderer as NodeRenderer<Node>);
    } else if (typeof type === 'string') {
      this.nodes.set(type, renderer as NodeRenderer<Node>);
    }
    return this;
  }

  toForm() {
    const getRegistry = () => this;

    return {
      Form({ children, defaultValues }: FormProps) {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- assume default values unchanged
        const engine = useMemo(() => new DataEngine(defaultValues), []);

        return (
          <Provider registry={getRegistry()} dataEngine={engine}>
            {children}
          </Provider>
        );
      },
      Field({ field, schema }: { field: FieldKey; schema: Node }) {
        const render = useRender();
        return render(field, schema);
      },
    };
  }
}

export interface SchemaRegistryPlugin {
  apply: (registry: SchemaRegistry) => void;
}
