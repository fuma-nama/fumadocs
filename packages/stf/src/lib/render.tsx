import { createContext, ReactNode, use, useMemo } from 'react';
import { SchemaRegistry } from './registry';
import type { DataEngine } from './data-engine';
import type { Node, FieldKey } from './types';

const Context = createContext<{
  registry: SchemaRegistry;
  engine: DataEngine;
} | null>(null);

export function Provider({
  dataEngine,
  registry,
  children,
}: {
  dataEngine: DataEngine;
  registry: SchemaRegistry;
  children: ReactNode;
}) {
  return (
    <Context
      value={useMemo(
        () => ({
          registry,
          engine: dataEngine,
        }),
        [registry, dataEngine],
      )}
    >
      {children}
    </Context>
  );
}

export function useDataEngine() {
  return use(Context)!.engine;
}

export function useRender() {
  const { registry } = use(Context)!;

  return function render(key: FieldKey, v: Node, ctx?: Record<string, unknown>) {
    const renderer = registry.getNodeRenderer(v.type);
    if (!renderer) throw new Error(`missing renderer for "${v.type}" node`);
    const Renderer = renderer.Node;
    return <Renderer field={key} node={v} {...ctx} />;
  };
}
