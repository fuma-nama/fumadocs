import { useMemo, type ReactNode } from 'react';
import type { Node, NodeRenderer } from './node';
import type { FC } from 'react';
import { DataEngine, DataEngineProvider } from './data-engine';

export interface FormProps {
  defaultValues?: object;
}

export class SchemaRegistry {
  private readonly nodes = new Map<string, NodeRenderer<Node>>();

  use(plugin: SchemaRegistryPlugin) {
    plugin.apply(this);
    return this;
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

  toForm(root: Node): FC<FormProps> {
    const render = (key: string[], v: Node): ReactNode => {
      const renderer = this.nodes.get(v.type);
      if (!renderer) throw new Error(`missing renderer for "${v.type}" node`);
      const Renderer = renderer.Node;
      return <Renderer field={key} render={render} node={v} />;
    };

    return function Form(props) {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- assume default values unchanged
      const engine = useMemo(() => new DataEngine(props.defaultValues), []);

      return <DataEngineProvider value={engine}>{render([], root)}</DataEngineProvider>;
    };
  }
}

export interface SchemaRegistryPlugin {
  apply: (registry: SchemaRegistry) => void;
}
