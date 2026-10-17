import {
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  getNamedType,
  type GraphQLCompositeType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLSchema,
  type InlineFragmentNode,
  isCompositeType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  isRequiredArgument,
  isUnionType,
  Kind,
  type OperationDefinitionNode,
  parse,
  print,
  type SelectionNode,
  type SelectionSetNode,
  TypeNameMetaFieldDef,
} from 'graphql';
import type { OperationKind } from '@/utils/schema';

interface OperationRef {
  kind: OperationKind;
  name: string;
}

/** a step from the root field into its selection: a field, or the inline fragment of a possible type */
export type SelectionStep = { field: string } | { on: string };

export interface SelectionLevel {
  /** names of the fields selected directly at this level, aliases ignored */
  fields: Set<string>;
  /** type conditions of the inline fragments at this level */
  fragments: Set<string>;
  /** fields selected through the named fragments spread at this level, with the name of the spread */
  spread: Map<string, string>;
}

/**
 * The selection at `path` of the first operation of `kind` that selects the root field `name`.
 * `undefined` when no operation selects it or the path isn't selected.
 */
export function readSelection(
  document: DocumentNode,
  operation: OperationRef,
  path: readonly SelectionStep[],
): SelectionLevel | undefined {
  let selectionSet = findOperation(document, operation)?.selectionSet;
  for (const step of [{ field: operation.name }, ...path]) {
    selectionSet = selectionSet?.selections.find((node) => isStep(node, step))?.selectionSet;
  }
  if (!selectionSet) return;

  const level: SelectionLevel = { fields: new Set(), fragments: new Set(), spread: new Map() };
  const visited = new Set<string>();
  // nested spreads count as the one written at this level
  function readSpread(name: string, via: string) {
    if (visited.has(name)) return;
    visited.add(name);
    const fragment = document.definitions.find(
      (definition): definition is FragmentDefinitionNode =>
        definition.kind === Kind.FRAGMENT_DEFINITION && definition.name.value === name,
    );

    for (const node of fragment?.selectionSet.selections ?? []) {
      if (node.kind === Kind.FIELD) {
        if (!level.spread.has(node.name.value)) level.spread.set(node.name.value, via);
      } else if (node.kind === Kind.FRAGMENT_SPREAD) {
        readSpread(node.name.value, via);
      }
    }
  }

  for (const node of selectionSet.selections) {
    if (node.kind === Kind.FIELD) {
      level.fields.add(node.name.value);
    } else if (node.kind === Kind.INLINE_FRAGMENT && node.typeCondition) {
      level.fragments.add(node.typeCondition.name.value);
    } else if (node.kind === Kind.FRAGMENT_SPREAD) {
      readSpread(node.name.value, node.name.value);
    }
  }
  return level;
}

/**
 * Select or deselect `field` at `path`, creating the fields and inline fragments of `path` when missing.
 *
 * - A selected composite field gets a default sub-selection.
 * - A new field replaces a lone plain `__typename`, which only kept its level valid.
 * - Fields and inline fragments left empty by a deselect are removed, the root field gets `__typename` instead.
 *
 * Returns `query` unchanged when it can't be parsed or has no operation selecting the root field.
 */
export function toggleField(
  schema: GraphQLSchema,
  query: string,
  operation: OperationRef,
  path: readonly SelectionStep[],
  field: string,
  selected: boolean,
): string {
  const steps: readonly SelectionStep[] = [{ field: operation.name }, ...path];
  let type: GraphQLNamedType | null | undefined = schema.getRootType(operation.kind);
  for (const step of steps) {
    type = 'on' in step ? schema.getType(step.on) : getNamedType(getField(type, step.field)?.type);
    if (!isCompositeType(type)) return query;
  }
  const target = field === '__typename' ? TypeNameMetaFieldDef : getField(type, field);
  if (!target) return query;

  let document: DocumentNode;
  try {
    document = parse(query);
  } catch {
    return query;
  }
  const definition = findOperation(document, operation);
  if (!definition) return query;
  const named = getNamedType(target.type);

  // the selections at `depth` of `steps` after the change, `undefined` when unchanged
  function update(
    selections: readonly SelectionNode[],
    depth: number,
  ): readonly SelectionNode[] | undefined {
    if (depth === steps.length) {
      if (!selected) {
        const rest = selections.filter((item) => !isField(item, field));
        return rest.length < selections.length ? rest : undefined;
      }

      if (selections.some((item) => isField(item, field))) return;
      return append(
        selections,
        fieldNode(field, isCompositeType(named) ? defaultSelection(named) : undefined),
      );
    }

    const step = steps[depth];
    const index = selections.findIndex((item) => isStep(item, step));
    const parent = selections[index] as FieldNode | InlineFragmentNode | undefined;
    let children = update(parent?.selectionSet?.selections ?? [], depth + 1);
    if (!children) return;
    if (children.length === 0) {
      // emptied by a deselect, the root field is kept with `__typename`
      if (depth > 0) return selections.toSpliced(index, 1);
      children = [fieldNode('__typename')];
    }

    const selectionSet: SelectionSetNode = { kind: Kind.SELECTION_SET, selections: children };
    return parent
      ? selections.with(index, { ...parent, selectionSet })
      : append(selections, stepNode(step, selectionSet));
  }

  const selections = update(definition.selectionSet.selections, 0);
  if (!selections) return query;

  const updated: OperationDefinitionNode = {
    ...definition,
    selectionSet: { ...definition.selectionSet, selections },
  };
  return print({
    kind: Kind.DOCUMENT,
    definitions: document.definitions.map((item) => (item === definition ? updated : item)),
  });
}

/** the first operation of `kind` selecting the root field `name` */
export function findOperation(document: DocumentNode, { kind, name }: OperationRef) {
  return document.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === kind &&
      definition.selectionSet.selections.some((node) => isField(node, name)),
  );
}

// inline fragments keep the `__typename`, abstract types use it to tell their possible types apart
function append(selections: readonly SelectionNode[], node: SelectionNode): SelectionNode[] {
  const [only] = selections;
  const placeholder =
    selections.length === 1 &&
    isField(only, '__typename') &&
    !only.alias &&
    !only.directives?.length &&
    !only.selectionSet;

  return placeholder && node.kind === Kind.FIELD ? [node] : [...selections, node];
}

function isField(node: SelectionNode, name: string): node is FieldNode {
  return node.kind === Kind.FIELD && node.name.value === name;
}

function isStep(node: SelectionNode, step: SelectionStep): node is FieldNode | InlineFragmentNode {
  if ('on' in step) {
    return node.kind === Kind.INLINE_FRAGMENT && node.typeCondition?.name.value === step.on;
  }

  return isField(node, step.field);
}

function getField(
  type: GraphQLNamedType | null | undefined,
  name: string,
): GraphQLField<unknown, unknown> | undefined {
  return isObjectType(type) || isInterfaceType(type) ? type.getFields()[name] : undefined;
}

function fieldNode(name: string, selectionSet?: SelectionSetNode): FieldNode {
  return { kind: Kind.FIELD, name: { kind: Kind.NAME, value: name }, selectionSet };
}

function stepNode(step: SelectionStep, selectionSet: SelectionSetNode): SelectionNode {
  if (!('on' in step)) return fieldNode(step.field, selectionSet);

  return {
    kind: Kind.INLINE_FRAGMENT,
    typeCondition: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: step.on } },
    selectionSet,
  };
}

/**
 * GraphiQL's `fillLeafs` convention: `id`, otherwise the leaf fields, otherwise `__typename`.
 * Like the generated examples, deprecated fields and fields with required arguments are skipped.
 */
function defaultSelection(type: GraphQLCompositeType): SelectionSetNode {
  const selections: FieldNode[] = [];
  if (!isUnionType(type)) {
    const fields = type.getFields();

    if (fields.id && isDefaultField(fields.id)) {
      selections.push(fieldNode('id'));
    } else {
      for (const item of Object.values(fields)) {
        if (isDefaultField(item)) selections.push(fieldNode(item.name));
      }
    }
  }

  if (selections.length === 0) selections.push(fieldNode('__typename'));
  return { kind: Kind.SELECTION_SET, selections };
}

function isDefaultField(field: GraphQLField<unknown, unknown>): boolean {
  return (
    field.deprecationReason == null &&
    !field.args.some(isRequiredArgument) &&
    isLeafType(getNamedType(field.type))
  );
}
