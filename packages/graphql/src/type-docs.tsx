'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import {
  type DirectiveNode,
  type GraphQLInterfaceType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLUnionType,
  isInterfaceType,
  isObjectType,
  isUnionType,
} from 'graphql';
import {
  getCustomDirectives,
  getNamedTypeKind,
  getTypeUsages,
  getUnions,
  type NamedTypeKind,
  type TypeUsages,
} from '@/utils/schema';
import { useGraphQL } from '@/utils/create-page';

/** the named type and its resolved details, all read-only */
export interface NamedTypeInfo {
  name: string;
  kind: NamedTypeKind;
  type: GraphQLNamedType;
  /** custom directive applications */
  directives: DirectiveNode[];
  relations: {
    /** interfaces implemented by the type */
    implements: readonly GraphQLInterfaceType[];
    /** unions including the type, for objects */
    unions: readonly GraphQLUnionType[];
    /** objects implementing the type, for interfaces */
    implementedBy: readonly GraphQLObjectType[];
    /** members of the type, for unions */
    possibleTypes: readonly GraphQLObjectType[];
    usages: TypeUsages;
  };
}

/** props of the component rendering a named type of a page */
export interface PageTypeProps {
  name: string;
  showTitle?: boolean;
  showDescription?: boolean;
}

export interface TypeProviderProps {
  name: string;
  children: ReactNode;
}

const empty = [] as const;
const TypeContext = createContext<NamedTypeInfo | null>(null);

export function TypeProvider({ name, children }: TypeProviderProps) {
  const { schema } = useGraphQL();
  const info = useMemo<NamedTypeInfo>(() => {
    const type = schema.getType(name);
    if (!type) throw new Error(`[Fumadocs GraphQL] Type not found in schema: ${name}`);

    return {
      name,
      kind: getNamedTypeKind(type),
      type,
      directives: getCustomDirectives(type.astNode),
      relations: {
        implements: isObjectType(type) || isInterfaceType(type) ? type.getInterfaces() : empty,
        unions: isObjectType(type) ? getUnions(schema, type) : empty,
        implementedBy: isInterfaceType(type) ? schema.getImplementations(type).objects : empty,
        possibleTypes: isUnionType(type) ? type.getTypes() : empty,
        usages: getTypeUsages(schema, name),
      },
    };
  }, [schema, name]);

  return <TypeContext value={info}>{children}</TypeContext>;
}

export function useNamedType(): NamedTypeInfo {
  const ctx = use(TypeContext);
  if (!ctx) throw new Error('Component must be used under <TypeProvider />');

  return ctx;
}

export type { FieldRef, OperationRef, TypeUsages } from '@/utils/schema';
