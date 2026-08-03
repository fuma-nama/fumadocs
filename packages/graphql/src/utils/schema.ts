import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';
import {
  type DirectiveNode,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql';

export type OperationKind = 'query' | 'mutation' | 'subscription';
export type NamedTypeKind = 'object' | 'interface' | 'union' | 'enum' | 'input' | 'scalar';

export const OperationKinds: OperationKind[] = ['query', 'mutation', 'subscription'];

export function getRootType(
  schema: GraphQLSchema,
  kind: OperationKind,
): GraphQLObjectType | undefined | null {
  switch (kind) {
    case 'query':
      return schema.getQueryType();
    case 'mutation':
      return schema.getMutationType();
    case 'subscription':
      return schema.getSubscriptionType();
  }
}

/**
 * Get the display title of an operation, e.g. `createOrder` -> `Create Order`.
 */
export function getOperationTitle(name: string): string {
  return idToTitle(name);
}

export function getOperationField(
  schema: GraphQLSchema,
  kind: OperationKind,
  name: string,
): GraphQLField<unknown, unknown> | undefined {
  return getRootType(schema, kind)?.getFields()[name];
}

export function getNamedTypeKind(type: GraphQLNamedType): NamedTypeKind {
  if (isObjectType(type)) return 'object';
  if (isInterfaceType(type)) return 'interface';
  if (isUnionType(type)) return 'union';
  if (isEnumType(type)) return 'enum';
  if (isInputObjectType(type)) return 'input';
  return 'scalar';
}

/**
 * Named types that should receive their own documentation, excluding:
 *
 * - introspection types & built-in scalars.
 * - root operation types (documented as operations instead).
 */
export function getDocumentedTypes(schema: GraphQLSchema): GraphQLNamedType[] {
  const roots = new Set(
    OperationKinds.flatMap((kind) => {
      const root = getRootType(schema, kind);
      return root ? [root] : [];
    }),
  );
  const out: GraphQLNamedType[] = [];

  for (const type of Object.values(schema.getTypeMap())) {
    if (isIntrospectionType(type)) continue;
    if (isScalarType(type) && isSpecifiedScalarType(type)) continue;
    if (isObjectType(type) && roots.has(type)) continue;

    out.push(type);
  }

  return out;
}

const BuiltinDirectives = new Set(['deprecated', 'specifiedBy', 'include', 'skip', 'oneOf']);

/**
 * Custom directive applications on a schema element (e.g. access scopes), built-in directives are excluded.
 */
export function getCustomDirectives(
  astNode: { readonly directives?: readonly DirectiveNode[] } | null | undefined,
): DirectiveNode[] {
  if (!astNode?.directives) return [];

  return astNode.directives.filter((directive) => !BuiltinDirectives.has(directive.name.value));
}
