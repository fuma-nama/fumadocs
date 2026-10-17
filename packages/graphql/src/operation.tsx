'use client';
import { createContext, type ReactNode, use, useMemo, useState } from 'react';
import type { DirectiveNode, GraphQLField } from 'graphql';
import { idToTitle } from 'shared-api/utils/id-to-title';
import { getCustomDirectives, type OperationKind } from '@/utils/schema';
import { generateOperationExample, type OperationExample } from '@/utils/example';
import { useGraphQL } from '@/utils/create-page';

/** the operation and its resolved details, all read-only */
export interface OperationInfo {
  kind: OperationKind;
  name: string;
  /**
   * display title of the operation, e.g. `createOrder` -> `Create Order`.
   */
  title: string;
  field: GraphQLField<unknown, unknown>;
  /** custom directive applications */
  directives: DirectiveNode[];
  /**
   * examples from the `examples` option of server, otherwise a generated one, empty when the operation cannot be sampled.
   */
  examples: OperationExample[];
  /** index of the selected example, shared by the example cards and playground */
  selected: number;
  select: (index: number) => void;
}

/** props of the component rendering an operation of a page */
export interface PageOperationProps {
  kind: OperationKind;
  name: string;
  showTitle?: boolean;
  showDescription?: boolean;
}

export interface OperationProviderProps {
  kind: OperationKind;
  name: string;
  children: ReactNode;
}

const OperationContext = createContext<OperationInfo | null>(null);

const empty: OperationExample[] = [];

export function OperationProvider({ kind, name, children }: OperationProviderProps) {
  const { schema, examples: allExamples } = useGraphQL();
  const custom = allExamples?.[`${kind}:${name}`];
  const [selected, select] = useState(0);
  const base = useMemo(() => {
    const field = schema.getRootType(kind)?.getFields()[name];
    if (!field)
      throw new Error(`[Fumadocs GraphQL] Operation not found in schema: ${kind} ${name}`);

    let examples = custom;
    if (!examples?.length) {
      const generated = generateOperationExample(schema, { kind, name });
      examples = generated ? [generated] : empty;
    }

    return {
      kind,
      name,
      title: idToTitle(name),
      field,
      directives: getCustomDirectives(field.astNode),
      examples,
    };
  }, [schema, kind, name, custom]);
  const info = useMemo<OperationInfo>(() => ({ ...base, selected, select }), [base, selected]);

  return <OperationContext value={info}>{children}</OperationContext>;
}

export function useOperation(): OperationInfo {
  const ctx = use(OperationContext);
  if (!ctx) throw new Error('Component must be used under <OperationProvider />');

  return ctx;
}
