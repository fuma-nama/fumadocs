import {
  type FieldNode,
  getNamedType,
  type GraphQLEnumType,
  type GraphQLInputType,
  type GraphQLInterfaceType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLScalarType,
  type GraphQLSchema,
  type GraphQLType,
  isEnumType,
  isLeafType,
  isListType,
  isNonNullType,
  isRequiredArgument,
  isRequiredInputField,
  isUnionType,
  Kind,
  type OperationDefinitionNode,
  OperationTypeNode,
  parseType,
  print,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import { getOperationField, type OperationKind } from '@/utils/schema';
import type { OperationItem } from '@/utils/pages/builder';

const OperationNodeTypes: Record<OperationKind, OperationTypeNode> = {
  query: OperationTypeNode.QUERY,
  mutation: OperationTypeNode.MUTATION,
  subscription: OperationTypeNode.SUBSCRIPTION,
};

export interface OperationExample {
  query: string;
  variables?: Record<string, unknown>;
  response: unknown;
}

export interface GenerateExampleOptions {
  /**
   * max depth of nested composite types in the selection set.
   *
   * @default 2
   */
  maxDepth?: number;
  /**
   * max leaf (scalar/enum) fields to select per composite type.
   *
   * @default 8
   */
  maxLeafFields?: number;
  /**
   * max nested composite fields to select per composite type.
   *
   * @default 2
   */
  maxCompositeFields?: number;
}

/**
 * Generate a deterministic example (query, variables and response) for an operation.
 */
export function generateOperationExample(
  schema: GraphQLSchema,
  item: OperationItem,
  options: GenerateExampleOptions = {},
): OperationExample | undefined {
  const { maxDepth = 2, maxLeafFields = 8, maxCompositeFields = 2 } = options;
  const field = getOperationField(schema, item.kind, item.name);
  if (!field) return;

  const args = field.args.filter(isRequiredArgument);
  const selected = selectionForType(field.type, 0);

  const operation: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: OperationNodeTypes[item.kind],
    name: {
      kind: Kind.NAME,
      value: field.name.charAt(0).toUpperCase() + field.name.slice(1),
    },
    variableDefinitions: args.map((arg) => ({
      kind: Kind.VARIABLE_DEFINITION,
      variable: {
        kind: Kind.VARIABLE,
        name: { kind: Kind.NAME, value: arg.name },
      },
      type: parseType(String(arg.type)),
    })),
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [
        {
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: field.name },
          arguments: args.map((arg) => ({
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: arg.name },
            value: {
              kind: Kind.VARIABLE,
              name: { kind: Kind.NAME, value: arg.name },
            },
          })),
          selectionSet: selected?.selectionSet,
        },
      ],
    },
  };

  return {
    query: print({ kind: Kind.DOCUMENT, definitions: [operation] }),
    variables:
      args.length > 0
        ? Object.fromEntries(args.map((arg) => [arg.name, sampleInput(arg.type, 0)]))
        : undefined,
    response: {
      data: {
        [field.name]: selected ? wrapSample(field.type, selected.sample) : null,
      },
    },
  };

  interface Selected {
    selectionSet?: SelectionSetNode;
    /**
     * a sample value of the **named** type, apply `wrapSample` to get the value of a wrapped type.
     */
    sample: unknown;
  }

  function selectionForType(type: GraphQLOutputType, depth: number): Selected {
    const named = getNamedType(type);
    if (isLeafType(named)) return { sample: sampleLeaf(named) };

    if (isUnionType(named)) {
      const first = named.getTypes()[0];
      const selections: SelectionNode[] = [
        {
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: '__typename' },
        },
      ];
      let sample: Record<string, unknown> = {};

      if (first && depth < maxDepth) {
        const sub = objectSelection(first, depth + 1);
        selections.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: { kind: Kind.NAME, value: first.name },
          },
          selectionSet: sub.selectionSet!,
        });
        sample = sub.sample as Record<string, unknown>;
      }

      return {
        selectionSet: { kind: Kind.SELECTION_SET, selections },
        sample: { __typename: first?.name, ...sample },
      };
    }

    return objectSelection(named, depth);
  }

  function objectSelection(
    type: GraphQLObjectType | GraphQLInterfaceType,
    depth: number,
  ): Selected {
    const selections: SelectionNode[] = [];
    const sample: Record<string, unknown> = {};
    let leafCount = 0;
    let compositeCount = 0;

    for (const field of Object.values(type.getFields())) {
      if (field.deprecationReason != null || field.args.some(isRequiredArgument)) continue;
      const named = getNamedType(field.type);

      if (isLeafType(named)) {
        if (leafCount >= maxLeafFields) continue;
        leafCount++;

        selections.push({
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: field.name },
        } satisfies FieldNode);
        sample[field.name] = wrapSample(field.type, sampleLeaf(named));
      } else if (depth < maxDepth && compositeCount < maxCompositeFields) {
        const sub = selectionForType(field.type, depth + 1);
        if (!sub.selectionSet) continue;
        compositeCount++;

        selections.push({
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: field.name },
          selectionSet: sub.selectionSet,
        } satisfies FieldNode);
        sample[field.name] = wrapSample(field.type, sub.sample);
      }
    }

    if (selections.length === 0) {
      selections.push({
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: '__typename' },
      });
      sample.__typename = type.name;
    }

    return {
      selectionSet: { kind: Kind.SELECTION_SET, selections },
      sample,
    };
  }

  function sampleInput(type: GraphQLInputType, depth: number): unknown {
    if (isNonNullType(type)) return sampleInput(type.ofType, depth);
    if (isListType(type)) return [sampleInput(type.ofType, depth)];
    if (isLeafType(type)) return sampleLeaf(type);

    const out: Record<string, unknown> = {};
    // input object, guard against cyclic references
    if (depth >= 4) return out;

    const fields = Object.values(type.getFields());
    let included = fields.filter(
      (field) => isRequiredInputField(field) || field.defaultValue !== undefined,
    );
    if (included.length === 0) included = fields.slice(0, 2);

    for (const field of included) {
      out[field.name] =
        field.defaultValue !== undefined ? field.defaultValue : sampleInput(field.type, depth + 1);
    }

    return out;
  }
}

function wrapSample(type: GraphQLType, sample: unknown): unknown {
  if (isNonNullType(type)) return wrapSample(type.ofType, sample);
  if (isListType(type)) return [wrapSample(type.ofType, sample)];
  return sample;
}

function sampleLeaf(type: GraphQLScalarType | GraphQLEnumType): unknown {
  if (isEnumType(type)) return type.getValues()[0]?.name ?? null;

  switch (type.name) {
    case 'ID':
      return '1';
    case 'String':
      return 'string';
    case 'Int':
      return 10;
    case 'Float':
      return 10.5;
    case 'Boolean':
      return true;
    default:
      // custom scalar: use a placeholder
      return `<${type.name}>`;
  }
}
