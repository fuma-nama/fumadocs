import {
  type ArgumentNode,
  coerceInputLiteral,
  type DocumentNode,
  type FieldNode,
  getNamedType,
  type GraphQLArgument,
  type GraphQLDefaultInput,
  type GraphQLEnumType,
  type GraphQLField,
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
  type OperationTypeNode,
  parse,
  parseType,
  print,
  type SelectionNode,
  type SelectionSetNode,
  type VariableDefinitionNode,
} from 'graphql';
import { getOperationField } from '@/utils/schema';
import type { OperationItem } from '@/utils/pages';

export interface OperationExample {
  query: string;
  variables?: Record<string, unknown>;
  response: unknown;
}

/**
 * max depth of nested composite types in the selection set.
 */
const maxDepth = 2;
/**
 * max leaf (scalar/enum) fields to select per composite type.
 */
const maxLeafFields = 8;
/**
 * max nested composite fields to select per composite type.
 */
const maxCompositeFields = 2;

/**
 * Generate a deterministic example (query, variables and response) for an operation.
 */
export function generateOperationExample(
  schema: GraphQLSchema,
  item: OperationItem,
): OperationExample | undefined {
  const field = getOperationField(schema, item.kind, item.name);
  if (!field) return;

  const args = field.args.filter(isRequiredArgument);
  const selected = selectionForType(field.type, 0);

  const operation: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    // `OperationTypeNode` values are the kind names
    operation: item.kind as OperationTypeNode,
    name: {
      kind: Kind.NAME,
      value: field.name.charAt(0).toUpperCase() + field.name.slice(1),
    },
    variableDefinitions: args.map(variableDefinitionFor),
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [
        {
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: field.name },
          arguments: args.map(argumentFor),
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
}

function argumentFor(arg: GraphQLArgument): ArgumentNode {
  return {
    kind: Kind.ARGUMENT,
    name: { kind: Kind.NAME, value: arg.name },
    value: {
      kind: Kind.VARIABLE,
      name: { kind: Kind.NAME, value: arg.name },
    },
  };
}

function variableDefinitionFor(arg: GraphQLArgument): VariableDefinitionNode {
  return {
    kind: Kind.VARIABLE_DEFINITION,
    variable: {
      kind: Kind.VARIABLE,
      name: { kind: Kind.NAME, value: arg.name },
    },
    type: parseType(String(arg.type)),
  };
}

/**
 * @returns if the argument is the `name: $name` pair we generate, rather than a value written by hand.
 */
function isGeneratedArgument(node: ArgumentNode, name: string): boolean {
  return node.value.kind === Kind.VARIABLE && node.value.name.value === name;
}

/**
 * Declare the variables of an operation for the arguments that are currently set.
 *
 * A playground shows an input for every argument, but a query only declares the ones it uses.
 * Setting an argument the document doesn't declare would send a variable nothing references,
 * which servers ignore — the request silently runs without it.
 *
 * @param query the query document, returned unchanged when it cannot be parsed (e.g. mid-edit).
 * @param field the operation being edited.
 * @param isSet whether the argument is set in the form.
 * @param prune also undeclare arguments that are no longer set. This rewrites the document on the
 * user's behalf, only do so in response to them unsetting an argument.
 */
export function syncOperationVariables(
  query: string,
  field: GraphQLField<unknown, unknown>,
  isSet: (name: string) => boolean,
  { prune = false }: { prune?: boolean } = {},
): string {
  let document: DocumentNode;
  try {
    document = parse(query);
  } catch {
    return query;
  }

  let changed = false;
  const definitions = document.definitions.map((definition) => {
    if (definition.kind !== Kind.OPERATION_DEFINITION) return definition;
    const root = definition.selectionSet.selections.find(
      (selection): selection is FieldNode =>
        selection.kind === Kind.FIELD && selection.name.value === field.name,
    );
    if (!root) return definition;

    const args = [...(root.arguments ?? [])];
    const variables = [...(definition.variableDefinitions ?? [])];
    let updated = false;

    for (const arg of field.args) {
      const argIndex = args.findIndex((item) => item.name.value === arg.name);
      const variableIndex = variables.findIndex((item) => item.variable.name.value === arg.name);
      const argNode = argIndex === -1 ? undefined : args[argIndex];
      // values written by hand are never ours to touch
      const isOurs = !argNode || isGeneratedArgument(argNode, arg.name);

      if (isSet(arg.name)) {
        if (!isOurs) continue;

        if (!argNode) {
          args.push(argumentFor(arg));
          updated = true;
        }

        if (variableIndex === -1) {
          variables.push(variableDefinitionFor(arg));
          updated = true;
        }

        continue;
      }

      if (!prune || !argNode || !isOurs) continue;
      args.splice(argIndex, 1);
      if (variableIndex !== -1) variables.splice(variableIndex, 1);
      updated = true;
    }

    if (!updated) return definition;
    changed = true;

    return {
      ...definition,
      variableDefinitions: variables,
      selectionSet: {
        ...definition.selectionSet,
        selections: definition.selectionSet.selections.map((selection) =>
          selection === root ? { ...root, arguments: args } : selection,
        ),
      },
    } satisfies OperationDefinitionNode;
  });

  if (!changed) return query;
  return print({ kind: Kind.DOCUMENT, definitions });
}

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

function objectSelection(type: GraphQLObjectType | GraphQLInterfaceType, depth: number): Selected {
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
    (field) => isRequiredInputField(field) || field.default !== undefined,
  );
  if (included.length === 0) included = fields.slice(0, 2);

  for (const field of included) {
    out[field.name] =
      field.default !== undefined
        ? resolveDefaultValue(field.default, field.type)
        : sampleInput(field.type, depth + 1);
  }

  return out;
}

function resolveDefaultValue(defaultInput: GraphQLDefaultInput, type: GraphQLInputType): unknown {
  if (defaultInput.literal) return coerceInputLiteral(defaultInput.literal, type);
  return defaultInput.value;
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
