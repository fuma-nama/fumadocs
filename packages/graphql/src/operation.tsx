'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import type { DirectiveNode, GraphQLField } from 'graphql';
import {
  getCustomDirectives,
  getOperationField,
  getOperationTitle,
  type OperationKind,
} from '@/utils/schema';
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
   * a generated example, `undefined` when the operation cannot be sampled.
   */
  example?: OperationExample;
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

export function OperationProvider({ kind, name, children }: OperationProviderProps) {
  const { schema } = useGraphQL();
  const info = useMemo<OperationInfo>(() => {
    const field = getOperationField(schema, kind, name);
    if (!field)
      throw new Error(`[Fumadocs GraphQL] Operation not found in schema: ${kind} ${name}`);

    return {
      kind,
      name,
      title: getOperationTitle(name),
      field,
      directives: getCustomDirectives(field.astNode),
      example: generateOperationExample(schema, { kind, name }),
    };
  }, [schema, kind, name]);

  return <OperationContext value={info}>{children}</OperationContext>;
}

export function useOperation(): OperationInfo {
  const ctx = use(OperationContext);
  if (!ctx) throw new Error('Component must be used under <OperationProvider />');

  return ctx;
}
