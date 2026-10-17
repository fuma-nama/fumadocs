import {
  type DirectiveNode,
  getNamedType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
  type GraphQLUnionType,
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
  const roots = new Set<GraphQLNamedType | null | undefined>(
    OperationKinds.map((kind) => schema.getRootType(kind)),
  );
  const out: GraphQLNamedType[] = [];

  for (const type of Object.values(schema.getTypeMap())) {
    if (isIntrospectionType(type)) continue;
    if (isScalarType(type) && isSpecifiedScalarType(type)) continue;
    if (roots.has(type)) continue;

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
 * The unions that include an object type, in the order of schema.
 */
export function getUnions(schema: GraphQLSchema, type: GraphQLObjectType): GraphQLUnionType[] {
  return getIndex(schema).unions.get(type.name) ?? [];
}

/**
 * Usages of a named type across the schema, for the backlinks of type pages, in a deterministic order.
 *
 * Introspection types and root operation types are excluded.
 */
export function getTypeUsages(schema: GraphQLSchema, typeName: string): TypeUsages {
  return (
    getIndex(schema).usages.get(typeName) ?? {
      returnedBy: [],
      memberOf: [],
      inputFor: [],
      argumentOf: [],
    }
  );
}

interface SchemaIndex {
  /** by the name of used type */
  usages: Map<string, TypeUsages>;
  /** by the name of member object */
  unions: Map<string, GraphQLUnionType[]>;
}

const indexes = new WeakMap<GraphQLSchema, SchemaIndex>();

/** the usages and unions of all types, built in one pass per schema */
function getIndex(schema: GraphQLSchema): SchemaIndex {
  const cached = indexes.get(schema);
  if (cached) return cached;

  const usages = new Map<string, TypeUsages>();
  const unions = new Map<string, GraphQLUnionType[]>();
  function usagesOf(type: GraphQLType): TypeUsages {
    const { name } = getNamedType(type);
    let item = usages.get(name);
    if (!item) {
      item = { returnedBy: [], memberOf: [], inputFor: [], argumentOf: [] };
      usages.set(name, item);
    }
    return item;
  }

  // a field is listed once when several of its arguments use the type, they are visited in a row
  const rootNames = new Set<string>();
  for (const kind of OperationKinds) {
    const root = schema.getRootType(kind);
    if (!root) continue;
    rootNames.add(root.name);

    for (const field of Object.values(root.getFields())) {
      usagesOf(field.type).returnedBy.push({ kind, name: field.name });
      for (const arg of field.args) {
        const list = usagesOf(arg.type).inputFor;
        const last = list.at(-1);
        if (last?.kind !== kind || last.name !== field.name) list.push({ kind, name: field.name });
      }
    }
  }

  for (const type of Object.values(schema.getTypeMap())) {
    if (isIntrospectionType(type) || rootNames.has(type.name)) continue;

    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        usagesOf(field.type).memberOf.push({ parent: type.name, field: field.name });
        for (const arg of field.args) {
          const list = usagesOf(arg.type).argumentOf;
          const last = list.at(-1);
          if (last?.parent !== type.name || last.field !== field.name)
            list.push({ parent: type.name, field: field.name });
        }
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        usagesOf(field.type).memberOf.push({ parent: type.name, field: field.name });
      }
    } else if (isUnionType(type)) {
      for (const member of type.getTypes()) {
        const list = unions.get(member.name);
        if (list) list.push(type);
        else unions.set(member.name, [type]);
      }
    }
  }

  for (const item of usages.values()) {
    item.returnedBy.sort(compareOperationRefs);
    item.inputFor.sort(compareOperationRefs);
    item.memberOf.sort(compareFieldRefs);
    item.argumentOf.sort(compareFieldRefs);
  }

  const index: SchemaIndex = { usages, unions };
  indexes.set(schema, index);
  return index;
}

function compareOperationRefs(a: OperationRef, b: OperationRef): number {
  if (a.kind !== b.kind) return OperationKinds.indexOf(a.kind) - OperationKinds.indexOf(b.kind);
  return a.name.localeCompare(b.name);
}

function compareFieldRefs(a: FieldRef, b: FieldRef): number {
  if (a.parent !== b.parent) return a.parent.localeCompare(b.parent);
  return a.field.localeCompare(b.field);
}
