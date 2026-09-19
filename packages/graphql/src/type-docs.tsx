'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import {
  type DirectiveNode,
  getNamedType,
  type GraphQLInterfaceType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  isInputObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isUnionType,
} from 'graphql';
import {
  getCustomDirectives,
  getNamedTypeKind,
  getRootType,
  type NamedTypeKind,
  type OperationKind,
  OperationKinds,
} from '@/utils/schema';
import { useGraphQL } from '@/headless/runtime';

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
    /** objects implementing the type, for interfaces */
    implementedBy: readonly GraphQLObjectType[];
    /** members of the type, for unions */
    possibleTypes: readonly GraphQLObjectType[];
    usages: TypeUsages;
  };
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

export interface OperationRef {
  kind: OperationKind;
  name: string;
}

export interface FieldRef {
  /**
   * name of the parent type that declares `field`.
   */
  parent: string;
  field: string;
}

export interface TypeUsages {
  /**
   * operations whose return type resolves to this named type (list/non-null wrappers unwrapped).
   */
  returnedBy: OperationRef[];
  /**
   * object/interface/input object fields typed as this named type.
   */
  memberOf: FieldRef[];
  /**
   * operations with a direct argument of this named type.
   */
  inputFor: OperationRef[];
  /**
   * field arguments (on non-root types) typed as this named type.
   */
  argumentOf: FieldRef[];
}

/**
 * Collect usages of a named type across the schema, for the "Returned by" backlinks of type pages.
 *
 * A single `O(schema)` pass with deterministic ordering, memoized per `(schema, typeName)` by
 * {@link TypeProvider}. Introspection types and root operation types are excluded from the scan.
 */
function getTypeUsages(schema: GraphQLSchema, typeName: string): TypeUsages {
  const returnedBy: OperationRef[] = [];
  const memberOf: FieldRef[] = [];
  const inputFor: OperationRef[] = [];
  const argumentOf: FieldRef[] = [];

  const rootNames = new Set<string>();
  for (const kind of OperationKinds) {
    const root = getRootType(schema, kind);
    if (!root) continue;
    rootNames.add(root.name);

    for (const field of Object.values(root.getFields())) {
      if (getNamedType(field.type).name === typeName) {
        returnedBy.push({ kind, name: field.name });
      }
      if (field.args.some((arg) => getNamedType(arg.type).name === typeName)) {
        inputFor.push({ kind, name: field.name });
      }
    }
  }

  for (const type of Object.values(schema.getTypeMap())) {
    if (isIntrospectionType(type) || rootNames.has(type.name)) continue;

    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        if (getNamedType(field.type).name === typeName) {
          memberOf.push({ parent: type.name, field: field.name });
        }
        if (field.args.some((arg) => getNamedType(arg.type).name === typeName)) {
          argumentOf.push({ parent: type.name, field: field.name });
        }
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        if (getNamedType(field.type).name === typeName) {
          memberOf.push({ parent: type.name, field: field.name });
        }
      }
    }
  }

  returnedBy.sort(compareOperationRefs);
  inputFor.sort(compareOperationRefs);
  memberOf.sort(compareFieldRefs);
  argumentOf.sort(compareFieldRefs);

  return { returnedBy, memberOf, inputFor, argumentOf };
}

function compareOperationRefs(a: OperationRef, b: OperationRef): number {
  if (a.kind !== b.kind) return OperationKinds.indexOf(a.kind) - OperationKinds.indexOf(b.kind);
  return a.name.localeCompare(b.name);
}

function compareFieldRefs(a: FieldRef, b: FieldRef): number {
  if (a.parent !== b.parent) return a.parent.localeCompare(b.parent);
  return a.field.localeCompare(b.field);
}
