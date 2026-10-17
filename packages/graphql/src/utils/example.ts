import {
  type ArgumentNode,
  type ConstValueNode,
  type ExecutableDefinitionNode,
  type FieldNode,
  type FragmentDefinitionNode,
  getNamedType,
  type GraphQLAbstractType,
  type GraphQLArgument,
  type GraphQLCompositeType,
  type GraphQLDefaultInput,
  type GraphQLEnumType,
  type GraphQLInputType,
  type GraphQLInterfaceType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLScalarType,
  type GraphQLSchema,
  type GraphQLType,
  isAbstractType,
  isEnumType,
  isInterfaceType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isUnionType,
  Kind,
  type OperationDefinitionNode,
  parseType,
  print,
  type SelectionNode,
  type SelectionSetNode,
  typeFromAST,
  valueFromASTUntyped,
  type VariableDefinitionNode,
} from 'graphql';
import { getOperationField, getRootType } from '@/utils/schema';
import type { OperationItem } from '@/utils/pages';

export interface OperationExample {
  /** the title of example, `undefined` for the generated one */
  name?: string;
  /** Markdown */
  description?: string;
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

const typenameField: FieldNode = {
  kind: Kind.FIELD,
  name: { kind: Kind.NAME, value: '__typename' },
};

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
  return createOperationExample(schema, {
    kind: Kind.OPERATION_DEFINITION,
    operation: item.kind,
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
          selectionSet: selectionForType(field.type, 0),
        },
      ],
    },
  });
}

/**
 * The example of a valid operation: default values of variables become the variables, other
 * non-null variables are sampled, and the response is sampled from its selections. The query is
 * printed without the default values and descriptions, which graphql-js 16 servers reject.
 *
 * @param fragments the fragments the operation uses
 */
export function createOperationExample(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  fragments: readonly FragmentDefinitionNode[] = [],
): OperationExample {
  let variables: Record<string, unknown> | undefined;
  const variableDefinitions: VariableDefinitionNode[] = [];

  for (const definition of operation.variableDefinitions ?? []) {
    const { defaultValue, type } = definition;
    let value: unknown;
    if (defaultValue) value = literalValue(defaultValue);
    // nullable variables can be absent
    else if (type.kind === Kind.NON_NULL_TYPE) {
      value = sampleInput(typeFromAST(schema, type) as GraphQLInputType, 0);
    }

    if (value !== undefined) (variables ??= {})[definition.variable.name.value] = value;
    variableDefinitions.push({ ...definition, defaultValue: undefined, description: undefined });
  }

  const definitions: ExecutableDefinitionNode[] = [
    { ...operation, description: undefined, variableDefinitions },
  ];
  for (const fragment of fragments) definitions.push({ ...fragment, description: undefined });

  return {
    query: print({ kind: Kind.DOCUMENT, definitions }),
    variables,
    response: {
      data: sampleSelections(
        schema,
        getRootType(schema, operation.operation)!,
        [operation.selectionSet],
        fragments,
      ),
    },
  };
}

export function argumentFor(arg: GraphQLArgument): ArgumentNode {
  return {
    kind: Kind.ARGUMENT,
    name: { kind: Kind.NAME, value: arg.name },
    value: {
      kind: Kind.VARIABLE,
      name: { kind: Kind.NAME, value: arg.name },
    },
  };
}

export function variableDefinitionFor(arg: GraphQLArgument): VariableDefinitionNode {
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
 * Group the fields of a selection set on a type by their response keys, like the execution does.
 */
export function collectFields(
  schema: GraphQLSchema,
  type: GraphQLObjectType | GraphQLInterfaceType,
  selectionSet: SelectionSetNode,
  fragments: readonly FragmentDefinitionNode[],
  out: Map<string, FieldNode[]>,
  visited = new Set<string>(),
): void {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const key = selection.alias?.value ?? selection.name.value;
      const nodes = out.get(key);
      if (nodes) nodes.push(selection);
      else out.set(key, [selection]);
      continue;
    }

    // a fragment is collected once, cycles are left to validation
    if (selection.kind === Kind.FRAGMENT_SPREAD) {
      if (visited.has(selection.name.value)) continue;
      visited.add(selection.name.value);
    }
    const fragment =
      selection.kind === Kind.INLINE_FRAGMENT
        ? selection
        : fragments.find((item) => item.name.value === selection.name.value);
    if (!fragment) continue;
    const condition = fragment.typeCondition && schema.getType(fragment.typeCondition.name.value);
    if (
      !condition ||
      condition === type ||
      (isAbstractType(condition) && schema.isSubType(condition, type))
    ) {
      collectFields(schema, type, fragment.selectionSet, fragments, out, visited);
    }
  }
}

/**
 * Sample the response of selection sets on a type, abstract types are sampled as the first
 * possible type they target.
 */
function sampleSelections(
  schema: GraphQLSchema,
  type: GraphQLCompositeType,
  selectionSets: readonly SelectionSetNode[],
  fragments: readonly FragmentDefinitionNode[],
): Record<string, unknown> {
  const concrete = resolveType(schema, type, selectionSets, fragments);
  const fields = new Map<string, FieldNode[]>();
  for (const selectionSet of selectionSets) {
    collectFields(schema, concrete, selectionSet, fragments, fields);
  }

  const out: Record<string, unknown> = {};
  for (const [key, nodes] of fields) {
    const name = nodes[0].name.value;
    if (name === '__typename') {
      out[key] = concrete.name;
      continue;
    }

    const field = concrete.getFields()[name];
    if (!field) continue;
    const named = getNamedType(field.type);
    if (isLeafType(named)) {
      out[key] = wrapSample(field.type, sampleLeaf(named));
      continue;
    }

    // fields of the same response key are merged
    const subSets: SelectionSetNode[] = [];
    for (const node of nodes) if (node.selectionSet) subSets.push(node.selectionSet);
    out[key] = wrapSample(field.type, sampleSelections(schema, named, subSets, fragments));
  }

  return out;
}

function resolveType(
  schema: GraphQLSchema,
  type: GraphQLCompositeType,
  selectionSets: readonly SelectionSetNode[],
  fragments: readonly FragmentDefinitionNode[],
): GraphQLObjectType | GraphQLInterfaceType {
  if (isObjectType(type)) return type;
  const possibleTypes = schema.getPossibleTypes(type);
  // sample interfaces without implementations by their own fields
  if (possibleTypes.length === 0 && isInterfaceType(type)) return type;

  for (const selectionSet of selectionSets) {
    const target = findTargetType(schema, type, selectionSet, fragments);
    if (target) return target;
  }
  return possibleTypes[0];
}

/**
 * The first possible type of an abstract type that a type condition of the selection set names.
 */
function findTargetType(
  schema: GraphQLSchema,
  type: GraphQLAbstractType,
  selectionSet: SelectionSetNode,
  fragments: readonly FragmentDefinitionNode[],
): GraphQLObjectType | undefined {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) continue;
    const fragment =
      selection.kind === Kind.INLINE_FRAGMENT
        ? selection
        : fragments.find((item) => item.name.value === selection.name.value);
    if (!fragment) continue;

    const condition = fragment.typeCondition && schema.getType(fragment.typeCondition.name.value);
    if (isObjectType(condition)) {
      if (schema.isSubType(type, condition)) return condition;
      continue;
    }

    const target = findTargetType(schema, type, fragment.selectionSet, fragments);
    if (target) return target;
  }
}

function selectionForType(type: GraphQLOutputType, depth: number): SelectionSetNode | undefined {
  const named = getNamedType(type);
  if (isLeafType(named)) return;
  if (!isUnionType(named)) return objectSelection(named, depth);

  const selections: SelectionNode[] = [typenameField];
  const first = named.getTypes()[0];
  if (first && depth < maxDepth) {
    selections.push({
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: { kind: Kind.NAME, value: first.name },
      },
      selectionSet: objectSelection(first, depth + 1),
    });
  }

  return { kind: Kind.SELECTION_SET, selections };
}

function objectSelection(
  type: GraphQLObjectType | GraphQLInterfaceType,
  depth: number,
): SelectionSetNode {
  const selections: SelectionNode[] = [];
  let leafCount = 0;
  let compositeCount = 0;

  for (const field of Object.values(type.getFields())) {
    if (field.deprecationReason != null || field.args.some(isRequiredArgument)) continue;
    let selectionSet: SelectionSetNode | undefined;

    if (isLeafType(getNamedType(field.type))) {
      if (leafCount >= maxLeafFields) continue;
      leafCount++;
    } else {
      if (depth >= maxDepth || compositeCount >= maxCompositeFields) continue;
      compositeCount++;
      selectionSet = selectionForType(field.type, depth + 1);
    }

    selections.push({
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: field.name },
      selectionSet,
    });
  }

  if (selections.length === 0) selections.push(typenameField);
  return { kind: Kind.SELECTION_SET, selections };
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
  // `@oneOf` input objects take exactly one field
  if (included.length === 0) included = fields.slice(0, type.isOneOf ? 1 : 2);

  for (const field of included) {
    out[field.name] = field.default
      ? defaultValueOf(field.default)
      : sampleInput(field.type, depth + 1);
  }

  return out;
}

function defaultValueOf(defaultInput: GraphQLDefaultInput): unknown {
  return defaultInput.literal ? literalValue(defaultInput.literal) : defaultInput.value;
}

/** the JSON value of a literal, `valueFromASTUntyped` creates objects without prototypes */
function literalValue(node: ConstValueNode): unknown {
  return JSON.parse(JSON.stringify(valueFromASTUntyped(node)));
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
