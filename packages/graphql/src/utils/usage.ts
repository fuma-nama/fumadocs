import {
  getNamedType,
  type GraphQLSchema,
  isInputObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
} from 'graphql';
import { getRootType, type OperationKind, OperationKinds } from '@/utils/schema';

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
 * Collect usages of a named type across the schema, e.g. to render "Returned by" backlinks on type pages.
 *
 * A single `O(schema)` pass with deterministic ordering, safe to memoize per `(schema, typeName)`.
 * Introspection types and root operation types are excluded from the scan.
 */
export function getTypeUsages(schema: GraphQLSchema, typeName: string): TypeUsages {
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
