import {
  type DocumentNode,
  type FieldNode,
  type GraphQLField,
  isRequiredArgument,
  Kind,
  type OperationDefinitionNode,
  parse,
  print,
} from 'graphql';
import { argumentFor, variableDefinitionFor } from '@/utils/example';

/**
 * Declare the variables of an operation for the arguments that are currently set.
 *
 * A playground shows an input for every argument, but a query only declares the ones it uses.
 * Setting an argument the document doesn't declare would send a variable nothing references,
 * which servers ignore, the request silently runs without it.
 *
 * @param query the query document, returned unchanged when it cannot be parsed (e.g. mid-edit).
 * @param field the operation being edited.
 * @param isSet whether an optional argument is set in the form, required arguments are always declared.
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
      // only the `name: $name` pairs we generate, values written by hand are never ours to touch
      const isOurs =
        !argNode || (argNode.value.kind === Kind.VARIABLE && argNode.value.name.value === arg.name);

      if (isRequiredArgument(arg) || isSet(arg.name)) {
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
